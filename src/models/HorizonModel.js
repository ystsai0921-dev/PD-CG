import * as THREE from 'three';
import * as Astronomy from 'astronomy-engine';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { altAzToHorizonVector3, raDecToVector3 } from '../utils/astronomy.js';
import { createMoonTextures } from '../utils/moonTexture.js';

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
    // 地面草地/深色觀測平台圓盤
    const groundGeo = new THREE.CircleGeometry(DOME_RADIUS, 72);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f1f1c,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    this.groundGroup.add(new THREE.Mesh(groundGeo, groundMat));

    // 地平線外圈與同心距離圈
    [DOME_RADIUS * 0.33, DOME_RADIUS * 0.66, DOME_RADIUS].forEach((r, idx) => {
      const pts = [];
      for (let a = 0; a <= 360; a += 2) {
        const rad = THREE.MathUtils.degToRad(a);
        pts.push(new THREE.Vector3(Math.cos(rad) * r, 0.05, Math.sin(rad) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: idx === 2 ? 0x34d399 : 0x1e3a34,
        transparent: true,
        opacity: idx === 2 ? 0.9 : 0.6
      });
      this.groundGroup.add(new THREE.Line(geo, mat));
    });

    // 南北線與東西線
    const nsGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.06, -DOME_RADIUS),
      new THREE.Vector3(0, 0.06, DOME_RADIUS)
    ]);
    const ewGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-DOME_RADIUS, 0.06, 0),
      new THREE.Vector3(DOME_RADIUS, 0.06, 0)
    ]);
    const axisMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.5 });
    this.groundGroup.add(new THREE.Line(nsGeo, axisMat), new THREE.Line(ewGeo, axisMat));

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

    // 飄揚的中華民國國旗網格 (細分 24x12 頂點，以便即時計算隨風波浪飄動與地面真實幾何投影)
    this.flagSegX = 24;
    this.flagSegY = 12;
    const flagGeo = new THREE.PlaneGeometry(this.flagWidth, this.flagHeight, this.flagSegX, this.flagSegY);
    // 將國旗左緣 (x = 0) 對齊旗杆頂端下方
    flagGeo.translate(this.flagWidth / 2 + 0.12, this.poleHeight - this.flagHeight / 2 - 0.1, 0);

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
    this.gnomonGroup.add(this.flagMesh);

    // === 地面真實幾何投影影子 (True Geometric Shadow Projection on Ground y = 0.08) ===
    const shadowDarkMat = new THREE.MeshBasicMaterial({
      color: 0x02060d,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // 1. 旗杆在地面上的幾何投影帶 (Pole Shadow Quad)
    this.poleShadowGeo = new THREE.BufferGeometry();
    const poleShadowVerts = new Float32Array(4 * 3);
    this.poleShadowGeo.setAttribute('position', new THREE.BufferAttribute(poleShadowVerts, 3));
    this.poleShadowGeo.setIndex([0, 1, 2, 2, 1, 3]);
    this.poleShadowMesh = new THREE.Mesh(this.poleShadowGeo, shadowDarkMat);
    this.gnomonGroup.add(this.poleShadowMesh);

    // 2. 旗杆頂端圓球在地面上的投影橢圓點 (Finial Shadow Disc)
    this.finialShadowMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 20).rotateX(-Math.PI / 2),
      shadowDarkMat
    );
    this.gnomonGroup.add(this.finialShadowMesh);

    // 3. 飄揚國旗在地面上的真實 3D 光線幾何投影網格 (與 flagGeo 完全相同拓樸，逐頂點沿太陽光線投射至地面)
    this.flagShadowGeo = new THREE.BufferGeometry();
    const flagShadowVerts = new Float32Array(this.flagBasePositions.length);
    this.flagShadowGeo.setAttribute('position', new THREE.BufferAttribute(flagShadowVerts, 3));
    this.flagShadowGeo.setIndex(flagGeo.getIndex().clone());
    this.flagShadowMesh = new THREE.Mesh(this.flagShadowGeo, shadowDarkMat);
    this.gnomonGroup.add(this.flagShadowMesh);

    // 4. 辅助光學日影基準線 (標示竿頂日影方位與長度，便於讀取圭表日影方向)
    const guideGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(0, 0.1, 0)
    ]);
    this.shadowGuideLine = new THREE.Line(
      guideGeo,
      new THREE.LineDashedMaterial({ color: 0xfacc15, dashSize: 0.8, gapSize: 0.6, transparent: true, opacity: 0.65 })
    );
    this.gnomonGroup.add(this.shadowGuideLine);
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

    // 太陽至中心觀測點的光線視線虛線
    const rayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.sunRayLine = new THREE.Line(
      rayGeo,
      new THREE.LineDashedMaterial({ color: 0xfacc15, dashSize: 2, gapSize: 1.5, transparent: true, opacity: 0.55 })
    );
    this.skyBodiesGroup.add(this.sunRayLine);

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

    const moonRayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.moonRayLine = new THREE.Line(
      moonRayGeo,
      new THREE.LineDashedMaterial({ color: 0x93c5fd, dashSize: 2, gapSize: 1.5, transparent: true, opacity: 0.45 })
    );
    this.skyBodiesGroup.add(this.moonRayLine);

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

    this.sunRayLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), sunPos]);
    this.sunRayLine.computeLineDistances();

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

    this.moonRayLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), moonPos]);
    this.moonRayLine.computeLineDistances();

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
   * 將旗杆與飄揚國旗的每一個 3D 頂點 P(x, y, z) 真實幾何投影至地面平面 (y_ground = 0.08)：
   *   P_shadow = ( x - y * (Sx / Sy), 0.08, z - y * (Sz / Sy) )
   */
  animateFlagAndShadow(timeSec) {
    if (!this.flagMesh) return;

    const posAttr = this.flagMesh.geometry.attributes.position;
    const arr = posAttr.array;
    const base = this.flagBasePositions;
    const count = posAttr.count;

    // 1. 更新國旗 3D 飄揚波浪頂點 (越遠離旗杆 x=0.12 振幅越大)
    for (let i = 0; i < count; i++) {
      const bx = base[i * 3];
      const by = base[i * 3 + 1];
      const bz = base[i * 3 + 2];

      const distFromPole = Math.max(0, (bx - 0.12) / this.flagWidth);
      const wave1 = Math.sin(distFromPole * 5.5 - timeSec * 4.2) * 0.32 * distFromPole;
      const wave2 = Math.cos(distFromPole * 9.0 - timeSec * 6.5 + by * 0.8) * 0.1 * distFromPole;
      const flutterY = Math.sin(distFromPole * 4.0 - timeSec * 3.5) * 0.07 * distFromPole;

      arr[i * 3] = bx;
      arr[i * 3 + 1] = by + flutterY;
      arr[i * 3 + 2] = bz + wave1 + wave2;
    }
    posAttr.needsUpdate = true;
    this.flagMesh.geometry.computeVertexNormals();

    // 2. 計算旗杆與飄揚國旗在地面上的真實幾何投影影子 (當太陽仰角 > 1.5° 時投射)
    if (!this.currentSunDir || this.currentSunAlt <= 1.5) {
      this.poleShadowMesh.visible = false;
      this.finialShadowMesh.visible = false;
      this.flagShadowMesh.visible = false;
      this.shadowGuideLine.visible = false;
      return;
    }

    this.poleShadowMesh.visible = true;
    this.finialShadowMesh.visible = true;
    this.flagShadowMesh.visible = true;
    this.shadowGuideLine.visible = true;

    const S = this.currentSunDir;
    // 限制最低有效 Sy 避免日出日落極端無限遠拉伸超出圓盤過多
    const effectiveSy = Math.max(S.y, 0.08);
    const kx = S.x / effectiveSy;
    const kz = S.z / effectiveSy;
    const groundY = 0.08;

    // (a) 旗杆頂點與底點投影帶 (寬度對應旗杆直徑)
    const topH = this.poleHeight + 0.18;
    const tipX = -topH * kx;
    const tipZ = -topH * kz;

    // 計算垂直於日影方向的水平法向量以形成旗杆影子寬度
    const len = Math.hypot(tipX, tipZ) || 1;
    const nx = (-tipZ / len) * 0.15;
    const nz = (tipX / len) * 0.15;

    const pArr = this.poleShadowGeo.attributes.position.array;
    // 底端左右兩點
    pArr[0] = -nx; pArr[1] = groundY; pArr[2] = -nz;
    pArr[3] = nx;  pArr[4] = groundY; pArr[5] = nz;
    // 頂端左右兩點
    pArr[6] = tipX - nx * 0.85; pArr[7] = groundY; pArr[8] = tipZ - nz * 0.85;
    pArr[9] = tipX + nx * 0.85; pArr[10] = groundY; pArr[11] = tipZ + nz * 0.85;
    this.poleShadowGeo.attributes.position.needsUpdate = true;

    // (b) 旗杆頂端圓球投影位置
    this.finialShadowMesh.position.set(tipX, groundY + 0.005, tipZ);

    // (c) 飄揚國旗每一個 3D 頂點的真實平行光幾何投影
    const fShadowAttr = this.flagShadowGeo.attributes.position;
    const fShadowArr = fShadowAttr.array;
    for (let i = 0; i < count; i++) {
      const vx = arr[i * 3];
      const vy = arr[i * 3 + 1];
      const vz = arr[i * 3 + 2];

      fShadowArr[i * 3] = vx - vy * kx;
      fShadowArr[i * 3 + 1] = groundY + 0.008;
      fShadowArr[i * 3 + 2] = vz - vy * kz;
    }
    fShadowAttr.needsUpdate = true;

    // (d) 金色虛線標示竿頂幾何投影連線
    this.shadowGuideLine.geometry.setFromPoints([
      new THREE.Vector3(0, groundY + 0.02, 0),
      new THREE.Vector3(tipX, groundY + 0.02, tipZ)
    ]);
    this.shadowGuideLine.computeLineDistances();
  }
}
