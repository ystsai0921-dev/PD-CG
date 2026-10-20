import * as THREE from 'three';
import * as Astronomy from 'astronomy-engine';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { altAzToHorizonVector3, raDecToVector3 } from '../utils/astronomy.js?v=20261020_08';
import { createMoonTextures } from '../utils/moonTexture.js?v=20261020_08';

const DOME_RADIUS = 75;

/**
 * Level 3: 地平面日月運動模型 (Horizon Sun-Moon-Earth Model)
 * - 單純以使用者設定的地理位置 (Lat, Lon) 的地平面去觀察日、月的運動與方位仰角關係
 * - 包含方位羅盤 (N/E/S/W)、天頂網格、太陽與月球當日升落全軌跡弧線、以及中央立竿日影 (Gnomon)
 */
export class HorizonModel {
  constructor(onSelectObject) {
    this.group = new THREE.Group();
    this.onSelectObject = onSelectObject;
    this.pickables = [];
    this.labels = [];

    this.groundGroup = new THREE.Group();
    this.azGridGroup = new THREE.Group();
    this.dayPathGroup = new THREE.Group();
    this.gnomonGroup = new THREE.Group();
    this.skyBodiesGroup = new THREE.Group();

    this.group.add(
      this.groundGroup,
      this.azGridGroup,
      this.dayPathGroup,
      this.gnomonGroup,
      this.skyBodiesGroup
    );

    this.lastPathKey = '';

    this._buildGroundCompass();
    this._buildAltAzDomeGrid();
    this._buildGnomonAndShadow();
    this._buildSunAndMoon();
  }

  _buildGroundCompass() {
    // 地面石質日晷觀測平臺 (沉穩高對比青灰花崗石紋，使旗杆與國旗日影輪廓深邃、反差鮮明逼真)
    const groundGeo = new THREE.CircleGeometry(DOME_RADIUS, 96);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x243343,
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    this.groundGroup.add(new THREE.Mesh(groundGeo, groundMat));

    // 中央日晷基坪圓階 (石質日晷核心觀測區，半徑 12 單位)
    const dialCoreGeo = new THREE.CircleGeometry(12, 64);
    dialCoreGeo.rotateX(-Math.PI / 2);
    const dialCoreMat = new THREE.MeshStandardMaterial({
      color: 0x2c3d4f,
      roughness: 0.8,
      metalness: 0.12,
      side: THREE.DoubleSide
    });
    const dialCoreMesh = new THREE.Mesh(dialCoreGeo, dialCoreMat);
    dialCoreMesh.position.y = 0.015;
    this.groundGroup.add(dialCoreMesh);

    // 地平同心邊界環 (圓頂外緣半徑 DOME_RADIUS)
    const rimPts = [];
    for (let a = 0; a <= 360; a += 2) {
      const rad = THREE.MathUtils.degToRad(a);
      rimPts.push(new THREE.Vector3(Math.cos(rad) * DOME_RADIUS, 0.035, Math.sin(rad) * DOME_RADIUS));
    }
    const rimGeo = new THREE.BufferGeometry().setFromPoints(rimPts);
    const rimMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    this.groundGroup.add(new THREE.Line(rimGeo, rimMat));

    // 正南北子午線與正東西卯酉線 (僅在中央基石外圍 r >= 13 延伸至邊界，中央日晷平臺完全淨空，絕無任何線條穿透或切過日影)
    const nsGeo1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.035, -DOME_RADIUS),
      new THREE.Vector3(0, 0.035, -13)
    ]);
    const nsGeo2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.035, 13),
      new THREE.Vector3(0, 0.035, DOME_RADIUS)
    ]);
    const ewGeo1 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-DOME_RADIUS, 0.035, 0),
      new THREE.Vector3(-13, 0.035, 0)
    ]);
    const ewGeo2 = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(13, 0.035, 0),
      new THREE.Vector3(DOME_RADIUS, 0.035, 0)
    ]);
    const axisMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
    this.groundGroup.add(
      new THREE.Line(nsGeo1, axisMat),
      new THREE.Line(nsGeo2, axisMat),
      new THREE.Line(ewGeo1, axisMat),
      new THREE.Line(ewGeo2, axisMat)
    );

    // 方位標籤 (北 N, 東 E, 南 S, 西 W)
    const cardinals = [
      { text: '北 N (0°)', pos: new THREE.Vector3(0, 1.5, -DOME_RADIUS - 3) },
      { text: '東 E (90°)', pos: new THREE.Vector3(DOME_RADIUS + 3, 1.5, 0) },
      { text: '南 S (180°)', pos: new THREE.Vector3(0, 1.5, DOME_RADIUS + 3) },
      { text: '西 W (270°)', pos: new THREE.Vector3(-DOME_RADIUS - 3, 1.5, 0) }
    ];
    cardinals.forEach((c) => {
      this._createLabel(c.pos, c.text, 'celestial-label cardinal-label', this.groundGroup);
    });
  }

  _buildAltAzDomeGrid() {
    // 仰角圈 (30°, 60°)
    [30, 60].forEach((alt) => {
      const pts = [];
      for (let az = 0; az <= 360; az += 3) {
        pts.push(altAzToHorizonVector3(alt, az, DOME_RADIUS));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineDashedMaterial({
        color: 0x334155,
        dashSize: 2,
        gapSize: 1.5,
        transparent: true,
        opacity: 0.5
      });
      const line = new THREE.Line(geo, mat);
      line.computeLineDistances();
      this.azGridGroup.add(line);
    });

    // 子午線與卯酉圈弧線 (從北經天頂到南、從東經天頂到西)
    [0, 90].forEach((baseAz) => {
      const pts = [];
      for (let alt = 0; alt <= 180; alt += 3) {
        const effectiveAlt = alt <= 90 ? alt : 180 - alt;
        const effectiveAz = alt <= 90 ? baseAz : baseAz + 180;
        pts.push(altAzToHorizonVector3(effectiveAlt, effectiveAz, DOME_RADIUS));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: baseAz === 0 ? 0x38bdf8 : 0x334155,
        transparent: true,
        opacity: baseAz === 0 ? 0.5 : 0.35
      });
      this.azGridGroup.add(new THREE.Line(geo, mat));
    });

    this._createLabel(
      new THREE.Vector3(0, DOME_RADIUS + 3, 0),
      '天頂 Zenith (+90°)',
      'celestial-label',
      this.azGridGroup
    );
  }

  _createROCFlagTexture() {
    // 依照中華民國國旗標準比例 (3:2，青天白日滿地紅，十二道白日光芒) 繪製高解析度貼圖
    const w = 600;
    const h = 400;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    // 1. 滿地紅 (Crimson Red)
    ctx.fillStyle = '#de0022';
    ctx.fillRect(0, 0, w, h);

    // 2. 左上角青天 (Navy Blue Canton: 寬高各半 300x200)
    const cw = w / 2;
    const ch = h / 2;
    ctx.fillStyle = '#000095';
    ctx.fillRect(0, 0, cw, ch);

    // 3. 十二道光芒白日 (中心位於 (150, 100)，光芒外徑 R=75)
    const cx = cw / 2;
    const cy = ch / 2;
    const outerR = ch * 0.375; // 75
    const innerR = outerR * 0.5; // 37.5
    const bodyR = outerR * 0.5;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12 - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR * 0.86;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // 青色內環分隔線
    ctx.fillStyle = '#000095';
    ctx.beginPath();
    ctx.arc(cx, cy, bodyR + 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 中央白日圓心
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  _buildGnomonAndShadow() {
    // 中央旗杆座台與銀白金屬旗杆 (高 9.0 單位)
    this.poleHeight = 9.0;
    this.flagWidth = 3.6;
    this.flagHeight = 2.4;

    // 旗座基石
    const baseGeo = new THREE.CylinderGeometry(0.75, 0.95, 0.4, 24);
    baseGeo.translate(0, 0.2, 0);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6, metalness: 0.2 });
    this.gnomonGroup.add(new THREE.Mesh(baseGeo, baseMat));

    // 旗杆本體
    const poleGeo = new THREE.CylinderGeometry(0.11, 0.16, this.poleHeight, 20);
    poleGeo.translate(0, this.poleHeight / 2, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.7 });
    this.gnomonPole = new THREE.Mesh(poleGeo, poleMat);
    this.gnomonGroup.add(this.gnomonPole);

    // 旗杆頂端金色圓球 (Finial Ball)
    const finialGeo = new THREE.SphereGeometry(0.28, 16, 16);
    finialGeo.translate(0, this.poleHeight + 0.18, 0);
    const finialMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.85
    });
    this.gnomonGroup.add(new THREE.Mesh(finialGeo, finialMat));

    // 國旗專屬動態風向旋轉群組 (隨風向圍繞旗杆中心 (0,y,0) 旋轉，永保迎光舒展，不與日光共面，使國旗陰影完整舒展)
    this.flagGroup = new THREE.Group();
    this.gnomonGroup.add(this.flagGroup);

    // 飄揚的中華民國國旗網格 (細分 24x12 頂點，以便即時計算隨風波浪飄動與地面真實幾何投影)
    this.flagSegX = 24;
    this.flagSegY = 12;
    const flagGeo = new THREE.PlaneGeometry(this.flagWidth, this.flagHeight, this.flagSegX, this.flagSegY);
    // 將國旗左緣 (x = 0) 對齊旗杆外徑 (x = 0.16)，垂直對齊旗杆頂端下方
    flagGeo.translate(this.flagWidth / 2 + 0.16, this.poleHeight - this.flagHeight / 2 - 0.1, 0);

    // 備份未受風波動的原始頂點座標
    this.flagBasePositions = new Float32Array(flagGeo.attributes.position.array);

    const flagTex = this._createROCFlagTexture();
    const flagMat = new THREE.MeshStandardMaterial({
      map: flagTex,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.05,
      emissive: 0xffffff,
      emissiveMap: flagTex,
      emissiveIntensity: 0.22
    });
    this.flagMesh = new THREE.Mesh(flagGeo, flagMat);
    this.flagGroup.add(this.flagMesh);

    // === 地面真實雙層光學幾何投影日影 (深邃本影 Umbra + 柔和半影 Penumbra) ===
    // 陰影材質：啟用 polygonOffset 並提高 renderOrder，徹底防止近距放大 (Zoom In) 時與地面深度衝突或裁切消失
    const umbraMat = new THREE.MeshBasicMaterial({
      color: 0x010306,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4.0,
      polygonOffsetUnits: -4.0
    });

    const penumbraMat = new THREE.MeshBasicMaterial({
      color: 0x030814,
      transparent: true,
      opacity: 0.40,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2.0,
      polygonOffsetUnits: -2.0
    });

    // (A) 旗座基石地面陰影 (Base Pedestal Shadow)
    this.baseShadowGeo = new THREE.BufferGeometry();
    const baseShadowVerts = new Float32Array(4 * 3);
    this.baseShadowGeo.setAttribute('position', new THREE.BufferAttribute(baseShadowVerts, 3));
    this.baseShadowGeo.setIndex([0, 1, 2, 2, 1, 3]);
    this.baseShadowMesh = new THREE.Mesh(this.baseShadowGeo, umbraMat);
    this.baseShadowMesh.renderOrder = 20;
    this.baseShadowMesh.frustumCulled = false;
    this.gnomonGroup.add(this.baseShadowMesh);

    this.baseCapShadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 24).rotateX(-Math.PI / 2),
      umbraMat
    );
    this.baseCapShadowMesh.renderOrder = 20;
    this.baseCapShadowMesh.frustumCulled = false;
    this.gnomonGroup.add(this.baseCapShadowMesh);

    // (B) 旗杆在地面上的幾何投影帶 (Pole Core Umbra Quad)
    this.poleShadowGeo = new THREE.BufferGeometry();
    const poleShadowVerts = new Float32Array(4 * 3);
    this.poleShadowGeo.setAttribute('position', new THREE.BufferAttribute(poleShadowVerts, 3));
    this.poleShadowGeo.setIndex([0, 1, 2, 2, 1, 3]);
    this.poleShadowMesh = new THREE.Mesh(this.poleShadowGeo, umbraMat);
    this.poleShadowMesh.renderOrder = 20;
    this.poleShadowMesh.frustumCulled = false;
    this.gnomonGroup.add(this.poleShadowMesh);

    // 旗杆半影柔邊外緣 (Pole Penumbra Fringe)
    this.polePenumbraGeo = new THREE.BufferGeometry();
    const polePenumbraVerts = new Float32Array(4 * 3);
    this.polePenumbraGeo.setAttribute('position', new THREE.BufferAttribute(polePenumbraVerts, 3));
    this.polePenumbraGeo.setIndex([0, 1, 2, 2, 1, 3]);
    this.polePenumbraMesh = new THREE.Mesh(this.polePenumbraGeo, penumbraMat);
    this.polePenumbraMesh.renderOrder = 19;
    this.polePenumbraMesh.frustumCulled = false;
    this.gnomonGroup.add(this.polePenumbraMesh);

    // (C) 旗杆頂端金球投影點 (Finial Umbra + Penumbra Discs)
    this.finialShadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 20).rotateX(-Math.PI / 2),
      umbraMat
    );
    this.finialShadowMesh.renderOrder = 20;
    this.finialShadowMesh.frustumCulled = false;

    this.finialPenumbraMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.52, 20).rotateX(-Math.PI / 2),
      penumbraMat
    );
    this.finialPenumbraMesh.renderOrder = 19;
    this.finialPenumbraMesh.frustumCulled = false;
    this.gnomonGroup.add(this.finialPenumbraMesh, this.finialShadowMesh);

    // (D) 飄揚國旗在地面上的真實 3D 光線幾何投影網格 (Flag Core Umbra)
    this.flagShadowGeo = new THREE.BufferGeometry();
    const flagShadowVerts = new Float32Array(this.flagBasePositions.length);
    this.flagShadowGeo.setAttribute('position', new THREE.BufferAttribute(flagShadowVerts, 3));
    this.flagShadowGeo.setIndex(flagGeo.getIndex().clone());
    this.flagShadowMesh = new THREE.Mesh(this.flagShadowGeo, umbraMat);
    this.flagShadowMesh.renderOrder = 20;
    this.flagShadowMesh.frustumCulled = false; // 關鍵：禁止視錐體裁剪，近距離放大絕不消失！
    this.gnomonGroup.add(this.flagShadowMesh);

    // 國旗半影漫射外緣網格 (Flag Penumbra Fringe)
    this.flagPenumbraGeo = new THREE.BufferGeometry();
    const flagPenumbraVerts = new Float32Array(this.flagBasePositions.length);
    this.flagPenumbraGeo.setAttribute('position', new THREE.BufferAttribute(flagPenumbraVerts, 3));
    this.flagPenumbraGeo.setIndex(flagGeo.getIndex().clone());
    this.flagPenumbraMesh = new THREE.Mesh(this.flagPenumbraGeo, penumbraMat);
    this.flagPenumbraMesh.renderOrder = 19;
    this.flagPenumbraMesh.frustumCulled = false; // 關鍵：近距離放大絕不消失！
    this.gnomonGroup.add(this.flagPenumbraMesh);
  }

  _buildSunAndMoon() {
    // 太陽方向光：提供月球表面環形山凹凸陰影與真實月相明暗交界線 (Terminator)
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.8);
    this.group.add(this.sunLight);
    this.group.add(new THREE.AmbientLight(0x94a3b8, 0.22));

    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 28, 28),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    this.pickables.push(this.sunMesh);
    this.skyBodiesGroup.add(this.sunMesh);

    this.sunLabel = this._createLabel(
      new THREE.Vector3(),
      '☀ 太陽 <small>Sun</small>',
      'celestial-label zodiac-label',
      this.skyBodiesGroup,
      () => this.onSelectObject && this.onSelectObject(this.sunMesh.userData)
    );

    // 月球：貼上真實月球正面月海 (風暴洋、雨海、澄海、靜海、危海) 與隕石坑凹凸陰影貼圖 (Bump Map)
    const { colorMap, bumpMap } = createMoonTextures();
    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 48, 48),
      new THREE.MeshStandardMaterial({
        map: colorMap,
        bumpMap: bumpMap,
        bumpScale: 0.38,
        roughness: 0.88,
        metalness: 0.02,
        emissive: 0x1e293b,
        emissiveMap: colorMap,
        emissiveIntensity: 0.12
      })
    );
    this.pickables.push(this.moonMesh);
    this.skyBodiesGroup.add(this.moonMesh);

    this.moonLabel = this._createLabel(
      new THREE.Vector3(),
      '🌙 月球 <small>Moon</small>',
      'celestial-label planet-label',
      this.skyBodiesGroup,
      () => this.onSelectObject && this.onSelectObject(this.moonMesh.userData)
    );

    // 當日太陽與月球 24 小時全天軌跡線
    this.sunPathLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 })
    );
    this.moonPathLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0x60a5fa, dashSize: 2, gapSize: 1.5, transparent: true, opacity: 0.75 })
    );
    this.dayPathGroup.add(this.sunPathLine, this.moonPathLine);
  }

  _createLabel(pos, html, className, parent, onClick = null) {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = html;
    if (onClick) {
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
    }
    const label = new CSS2DObject(div);
    label.position.copy(pos);
    parent.add(label);
    this.labels.push(label);
    return label;
  }

  setOptions(options) {
    if (options.dayPath !== undefined) this.dayPathGroup.visible = options.dayPath;
    if (options.azGrid !== undefined) this.azGridGroup.visible = options.azGrid;
    if (options.shadow !== undefined) this.gnomonGroup.visible = options.shadow;
  }

  _rebuildDailyPaths(date, lat, lon) {
    const dayStr = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}_${lat.toFixed(2)}_${lon.toFixed(2)}`;
    if (this.lastPathKey === dayStr) return;
    this.lastPathKey = dayStr;

    const observer = new Astronomy.Observer(lat, lon, 0);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const sunPts = [];
    const moonPts = [];

    // 取樣當日 24 小時 (每 20 分鐘一點)
    for (let m = 0; m <= 1440; m += 20) {
      const sampleDate = new Date(startOfDay.getTime() + m * 60000);
      const t = Astronomy.MakeTime(sampleDate);

      const sEq = Astronomy.Equator(Astronomy.Body.Sun, t, observer, true, true);
      const sHor = Astronomy.Horizon(t, observer, sEq.ra, sEq.dec, 'normal');
      sunPts.push(altAzToHorizonVector3(sHor.altitude, sHor.azimuth, DOME_RADIUS));

      const mEq = Astronomy.Equator(Astronomy.Body.Moon, t, observer, true, true);
      const mHor = Astronomy.Horizon(t, observer, mEq.ra, mEq.dec, 'normal');
      moonPts.push(altAzToHorizonVector3(mHor.altitude, mHor.azimuth, DOME_RADIUS * 0.96));
    }

    this.sunPathLine.geometry.dispose();
    this.sunPathLine.geometry = new THREE.BufferGeometry().setFromPoints(sunPts);

    this.moonPathLine.geometry.dispose();
    this.moonPathLine.geometry = new THREE.BufferGeometry().setFromPoints(moonPts);
    this.moonPathLine.computeLineDistances();
  }

  update(ephemeris) {
    this._rebuildDailyPaths(ephemeris.date, ephemeris.lat, ephemeris.lon);

    // 1. 太陽地平位置
    const sunPos = altAzToHorizonVector3(ephemeris.sun.altitude, ephemeris.sun.azimuth, DOME_RADIUS);
    this.sunMesh.position.copy(sunPos);
    this.sunLabel.position.copy(sunPos.clone().add(new THREE.Vector3(0, 4.2, 0)));
    // 將太陽平行光源拉遠，使天頂圓頂上的月球也能根據真實日地月相對角度受光呈現凹凸陰影與月相
    this.sunLight.position.copy(sunPos.clone().normalize().multiplyScalar(DOME_RADIUS * 6));

    const sunAbove = ephemeris.sun.altitude >= 0;
    this.sunMesh.material.color.setHex(sunAbove ? 0xfacc15 : 0x9a3412);
    this.sunMesh.userData = {
      type: 'HorizonBody',
      title: `☀ 太陽 (${sunAbove ? '地平線上 - 白晝' : '地平線下 - 夜晚'})`,
      subtitle: `仰角 Altitude: ${ephemeris.sun.altitude.toFixed(2)}° | 方位角 Azimuth: ${ephemeris.sun.azimuth.toFixed(2)}°`,
      details: `觀測地點 (${ephemeris.lat.toFixed(2)}°, ${ephemeris.lon.toFixed(2)}°) 實時地平座標。\n黃道宮位：${ephemeris.sun.zodiac.symbol} ${ephemeris.sun.zodiac.nameZh} (${ephemeris.sun.zodiac.nameEn})`
    };

    // 2. 儲存目前太陽地平仰角與方向向量，並立即更新飄揚國旗與地面真實幾何投影日影
    this.currentSunAlt = ephemeris.sun.altitude;
    this.currentSunAz = ephemeris.sun.azimuth;
    this.currentSunDir = sunPos.clone().normalize();
    this.animateFlagAndShadow(performance.now() * 0.001);

    // 3. 月球地平位置與潮汐鎖定方向 (固定將月球正面 Near Side 朝向地球中央觀測者，北極對準北天極方向)
    const moonPos = altAzToHorizonVector3(ephemeris.moon.altitude, ephemeris.moon.azimuth, DOME_RADIUS * 0.96);
    this.moonMesh.position.copy(moonPos);

    // 北天極在地平座標系中的方向：方位角 0° (正北)，仰角 = 觀測者緯度 lat
    const northCelestialPoleDir = altAzToHorizonVector3(ephemeris.lat, 0, 1).normalize();
    this.moonMesh.up.copy(northCelestialPoleDir);
    // lookAt(0,0,0) 會將月球 Mesh 的 +Z 軸（貼圖中設定為月面經度 0° 正面中央：雨海、靜海、危海、風暴洋）永遠朝向地球觀測點
    this.moonMesh.lookAt(0, 0, 0);

    this.moonLabel.position.copy(moonPos.clone().add(new THREE.Vector3(0, 4.2, 0)));

    const moonAbove = ephemeris.moon.altitude >= 0;
    this.moonMesh.userData = {
      type: 'HorizonBody',
      title: `🌙 月球 (${moonAbove ? '地平線上可見' : '地平線下'})`,
      subtitle: `仰角 Altitude: ${ephemeris.moon.altitude.toFixed(2)}° | 方位角 Azimuth: ${ephemeris.moon.azimuth.toFixed(2)}°`,
      details: `月相：${ephemeris.moon.phaseName} | 照明率 ${(ephemeris.moon.fraction * 100).toFixed(1)}%\n潮汐鎖定：月球正面（風暴洋、雨海、澄海、靜海、危海與第谷坑）固定朝向地球觀測者。`
    };
  }

  /**
   * 每一幀更新國旗隨風飄揚的 3D 波浪形變，並根據太陽平行光向量 S = (Sx, Sy, Sz)
   * 將旗座、旗杆與飄揚國旗的每一個 3D 頂點真實幾何投影至地面 (y_ground = 0.06)：
   *   P_shadow = ( x - y * (Sx / Sy), groundY, z - y * (Sz / Sy) )
   */
  animateFlagAndShadow(timeSec) {
    if (!this.flagMesh || !this.flagShadowMesh) return;

    // 檢查太陽是否存在且仰角 > 0.5° (地平線上方方有日影)
    if (!this.currentSunDir || this.currentSunAlt <= 0.5) {
      this.baseShadowMesh.visible = false;
      this.baseCapShadowMesh.visible = false;
      this.poleShadowMesh.visible = false;
      this.polePenumbraMesh.visible = false;
      this.finialShadowMesh.visible = false;
      this.finialPenumbraMesh.visible = false;
      this.flagShadowMesh.visible = false;
      this.flagPenumbraMesh.visible = false;
      return;
    }

    this.baseShadowMesh.visible = true;
    this.baseCapShadowMesh.visible = true;
    this.poleShadowMesh.visible = true;
    this.polePenumbraMesh.visible = true;
    this.finialShadowMesh.visible = true;
    this.finialPenumbraMesh.visible = true;
    this.flagShadowMesh.visible = true;
    this.flagPenumbraMesh.visible = true;

    const S = this.currentSunDir;
    // 限制最低有效 Sy 避免日出日落極端拉伸超出圓盤過多
    const effectiveSy = Math.max(S.y, 0.08);
    const kx = S.x / effectiveSy;
    const kz = S.z / effectiveSy;
    const groundY = 0.08;

    // 1. 計算國旗迎風指向角 (Wind Heading Angle):
    // 太陽在水平面的射線角度為 atan2(-S.z, S.x)。
    // 國旗隨微風舒展在垂直於日射約 75° 的角度，使陽光充分照射旗面，
    // 不僅 3D 空間中展現完整青天白日滿地紅，更在地面投射出大面積、舒展飄動的完整國旗日影！
    const sunAngle = Math.atan2(-S.z, S.x);
    // 加入隨時間微幅擺動的真實風向自然偏角 (±3°)
    const breezeWiggle = Math.sin(timeSec * 0.8) * 0.05;
    const windAngle = sunAngle + 1.32 + breezeWiggle;
    if (this.flagGroup) {
      this.flagGroup.rotation.y = windAngle;
    }

    // 2. 更新國旗 3D 飄揚波浪頂點 (隨風向舒展，越遠離旗杆 x=0.16 振幅越大)
    const posAttr = this.flagMesh.geometry.attributes.position;
    const arr = posAttr.array;
    const base = this.flagBasePositions;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];

      const dist = Math.max(0, (bx - 0.16) / this.flagWidth);
      const wave1 = Math.sin(dist * 5.8 - timeSec * 4.6) * 0.36 * dist;
      const wave2 = Math.cos(dist * 9.5 - timeSec * 6.8 + by * 0.8) * 0.14 * dist;
      const flutterY = Math.sin(dist * 4.2 - timeSec * 3.6) * 0.08 * dist;

      arr[i * 3] = bx;
      arr[i * 3 + 1] = by + flutterY;
      arr[i * 3 + 2] = bz + wave1 + wave2;
    }
    posAttr.needsUpdate = true;
    this.flagMesh.geometry.computeVertexNormals();

    // 3. 旗座基石地面陰影 (高 0.4, 半徑 0.95)
    const baseH = 0.4;
    const bTipX = -baseH * kx;
    const bTipZ = -baseH * kz;
    const bLen = Math.hypot(bTipX, bTipZ) || 1;
    const bNx = (-bTipZ / bLen) * 0.95;
    const bNz = (bTipX / bLen) * 0.95;

    const bArr = this.baseShadowGeo.attributes.position.array;
    bArr[0] = -bNx;        bArr[1] = groundY + 0.002; bArr[2] = -bNz;
    bArr[3] = bNx;         bArr[4] = groundY + 0.002; bArr[5] = bNz;
    bArr[6] = bTipX - bNx; bArr[7] = groundY + 0.002; bArr[8] = bTipZ - bNz;
    bArr[9] = bTipX + bNx; bArr[10] = groundY + 0.002; bArr[11] = bTipZ + bNz;
    this.baseShadowGeo.attributes.position.needsUpdate = true;
    this.baseCapShadowMesh.position.set(bTipX, groundY + 0.003, bTipZ);

    // 4. 旗杆投影帶：本影核心與半影羽化
    const topH = this.poleHeight + 0.18;
    const tipX = -topH * kx;
    const tipZ = -topH * kz;
    const shadowLen = Math.hypot(tipX, tipZ);

    const len = shadowLen || 1;
    const nx = (-tipZ / len) * 0.16;
    const nz = (tipX / len) * 0.16;

    // 本影核心頂底端
    const pArr = this.poleShadowGeo.attributes.position.array;
    pArr[0] = bTipX - nx * 0.95; pArr[1] = groundY + 0.005; pArr[2] = bTipZ - nz * 0.95;
    pArr[3] = bTipX + nx * 0.95; pArr[4] = groundY + 0.005; pArr[5] = bTipZ + nz * 0.95;
    pArr[6] = tipX - nx * 0.8;   pArr[7] = groundY + 0.005; pArr[8] = tipZ - nz * 0.8;
    pArr[9] = tipX + nx * 0.8;   pArr[10] = groundY + 0.005; pArr[11] = tipZ + nz * 0.8;
    this.poleShadowGeo.attributes.position.needsUpdate = true;

    // 半影羽化層
    const penW = 0.25;
    const pArrPen = this.polePenumbraGeo.attributes.position.array;
    pArrPen[0] = bTipX - nx * (0.95 + penW); pArrPen[1] = groundY + 0.003; pArrPen[2] = bTipZ - nz * (0.95 + penW);
    pArrPen[3] = bTipX + nx * (0.95 + penW); pArrPen[4] = groundY + 0.003; pArrPen[5] = bTipZ + nz * (0.95 + penW);
    pArrPen[6] = tipX - nx * (0.8 + penW * 1.6); pArrPen[7] = groundY + 0.003; pArrPen[8] = tipZ - nz * (0.8 + penW * 1.6);
    pArrPen[9] = tipX + nx * (0.8 + penW * 1.6); pArrPen[10] = groundY + 0.003; pArrPen[11] = tipZ + nz * (0.8 + penW * 1.6);
    this.polePenumbraGeo.attributes.position.needsUpdate = true;

    // 5. 旗杆頂端圓球投影
    this.finialShadowMesh.position.set(tipX, groundY + 0.006, tipZ);
    this.finialPenumbraMesh.position.set(tipX, groundY + 0.003, tipZ);

    // 6. 飄揚國旗每一個 3D 頂點的真實平行光幾何投影 (本影 + 半影)
    // 國旗經 flagGroup.rotation.y 旋轉後的空間座標 (vx, vy, vz):
    const cosR = Math.cos(windAngle);
    const sinR = Math.sin(windAngle);
    const fShadowArr = this.flagShadowGeo.attributes.position.array;
    const fPenArr = this.flagPenumbraGeo.attributes.position.array;

    for (let i = 0; i < count; i++) {
      const lx = arr[i * 3];
      const ly = arr[i * 3 + 1];
      const lz = arr[i * 3 + 2];

      // 旋轉轉換至 gnomonGroup 坐標系
      const vx = lx * cosR + lz * sinR;
      const vy = ly;
      const vz = -lx * sinR + lz * cosR;

      // 平行光投影至地面 (y = groundY)
      const sx = vx - vy * kx;
      const sz = vz - vy * kz;

      fShadowArr[i * 3] = sx;
      fShadowArr[i * 3 + 1] = groundY + 0.008;
      fShadowArr[i * 3 + 2] = sz;

      // 半影微幅向外擴散羽化 (0.09)
      fPenArr[i * 3] = sx + Math.sin(i * 1.7) * 0.09;
      fPenArr[i * 3 + 1] = groundY + 0.004;
      fPenArr[i * 3 + 2] = sz + Math.cos(i * 1.7) * 0.09;
    }
    this.flagShadowGeo.attributes.position.needsUpdate = true;
    this.flagPenumbraGeo.attributes.position.needsUpdate = true;
    this.flagShadowGeo.computeVertexNormals();
    this.flagShadowGeo.computeBoundingSphere();
    this.flagPenumbraGeo.computeBoundingSphere();
  }
}
