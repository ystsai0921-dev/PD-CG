import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ZODIAC_CONSTELLATIONS, OTHER_CONSTELLATIONS } from '../data/zodiacData.js';
import {
  raDecToVector3,
  eclipticToVector3,
  OBLIQUITY_RAD,
  formatRA
} from '../utils/astronomy.js';
import { createEarthTextures } from '../utils/earthTexture.js';

const GLOBE_RADIUS = 100;
const EARTH_RADIUS = 7.2;

export class CelestialGlobeModel {
  constructor(onSelectObject) {
    this.group = new THREE.Group();
    this.onSelectObject = onSelectObject;
    this.pickables = [];
    this.labels = [];

    this.equatorGroup = new THREE.Group();
    this.eclipticGroup = new THREE.Group();
    this.zodiacGroup = new THREE.Group();
    this.otherConstGroup = new THREE.Group();
    this.horizonGroup = new THREE.Group();
    this.dynamicBodiesGroup = new THREE.Group();

    this.group.add(
      this.equatorGroup,
      this.eclipticGroup,
      this.zodiacGroup,
      this.otherConstGroup,
      this.horizonGroup,
      this.dynamicBodiesGroup
    );

    this.planetMeshes = {};
    this.zenithVec = new THREE.Vector3(0, 1, 0);
    this.zenithSpinSteps = 0;
    this.currentZenithAngle = 0;
    this.targetZenithAngle = 0;

    this._buildEarthCenter();
    this._buildStarfieldBackground();
    this._buildEquatorialGrid();
    this._buildEclipticBelt();
    this._buildConstellations();
    this._buildObserverHorizon();
    this._buildDynamicSkyBodies();
  }

  _buildEarthCenter() {
    const earthGroup = new THREE.Group();

    // 太陽對中心地球的真實方向照射光（呈現地球晝夜半球與陸地山脈陰影）
    this.earthSunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    this.group.add(this.earthSunLight);

    // 中心藍色地球（含海洋、各大洲陸地、台灣島與地形凹凸貼圖）
    const { colorMap, bumpMap } = createEarthTextures();
    const geo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 48);
    const mat = new THREE.MeshStandardMaterial({
      map: colorMap,
      bumpMap: bumpMap,
      bumpScale: 0.25,
      roughness: 0.55,
      metalness: 0.08,
      emissive: 0x0b1d3a,
      emissiveMap: colorMap,
      emissiveIntensity: 0.32
    });
    this.earthMesh = new THREE.Mesh(geo, mat);
    this.earthMesh.userData = {
      type: 'Body',
      title: '🌍 地球 (Earth - 天球中心)',
      subtitle: 'Geocentric Celestial Center',
      details: '地球位於天球正中央，自轉姿態與格林威治恆星時 (GST)、太陽照射方向及觀測者經緯度完全同步。'
    };
    this.pickables.push(this.earthMesh);
    earthGroup.add(this.earthMesh);

    // 地球淡藍色大氣層光暈外殼
    const atmoGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.035, 48, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.earthMesh.add(new THREE.Mesh(atmoGeo, atmoMat));

    // 地球赤道線與格林威治本初子午線微光標記
    const eqPts = [];
    for (let a = 0; a <= 360; a += 4) {
      const r = THREE.MathUtils.degToRad(a);
      eqPts.push(new THREE.Vector3(Math.cos(r) * (EARTH_RADIUS + 0.04), 0, Math.sin(r) * (EARTH_RADIUS + 0.04)));
    }
    this.earthMesh.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(eqPts),
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 })
      )
    );

    // 地軸 (連接北天極與南天極)
    const axisPts = [new THREE.Vector3(0, -GLOBE_RADIUS, 0), new THREE.Vector3(0, GLOBE_RADIUS, 0)];
    const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPts);
    const axisMat = new THREE.LineDashedMaterial({
      color: 0x60a5fa,
      dashSize: 2,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.45
    });
    const axisLine = new THREE.Line(axisGeo, axisMat);
    axisLine.computeLineDistances();
    earthGroup.add(axisLine);

    // 觀測者地表釘選點與法線立標 (隨輸入經緯度精準定位於地球陸地表面)
    const pinGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    this.observerPin = new THREE.Mesh(pinGeo, pinMat);
    this.earthMesh.add(this.observerPin);

    this.group.add(earthGroup);
  }

  _buildStarfieldBackground() {
    // 隨機產生 1200 顆背景微光恆星分佈在天球上
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 均勻球面分佈
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = GLOBE_RADIUS * 1.005;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const tint = 0.75 + Math.random() * 0.25;
      colors[i * 3] = tint;
      colors[i * 3 + 1] = tint;
      colors[i * 3 + 2] = Math.min(1, tint + 0.1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 1.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.65
    });

    this.group.add(new THREE.Points(geo, mat));
  }

  _buildEquatorialGrid() {
    // 赤緯圈 (每 30 度一圈，赤道 0 度特別加亮)
    for (let dec = -60; dec <= 60; dec += 30) {
      const isEquator = dec === 0;
      const pts = [];
      for (let ra = 0; ra <= 24; ra += 0.25) {
        pts.push(raDecToVector3(ra, dec, GLOBE_RADIUS));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: isEquator ? 0x38bdf8 : 0x334155,
        transparent: true,
        opacity: isEquator ? 0.85 : 0.32
      });
      this.equatorGroup.add(new THREE.Line(geo, mat));
    }

    // 赤經圈 (每 2h = 30 度一條經線)
    for (let ra = 0; ra < 24; ra += 2) {
      const pts = [];
      for (let dec = -90; dec <= 90; dec += 3) {
        pts.push(raDecToVector3(ra, dec, GLOBE_RADIUS));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: ra === 0 ? 0x60a5fa : 0x334155,
        transparent: true,
        opacity: ra === 0 ? 0.65 : 0.28
      });
      this.equatorGroup.add(new THREE.Line(geo, mat));
    }

    // 北天極與南天極標籤
    this._createLabel(
      new THREE.Vector3(0, GLOBE_RADIUS + 3, 0),
      '北天極 NCP (+90°)',
      'celestial-label',
      this.equatorGroup
    );
    this._createLabel(
      new THREE.Vector3(0, -GLOBE_RADIUS - 3, 0),
      '南天極 SCP (-90°)',
      'celestial-label',
      this.equatorGroup
    );
  }

  _buildEclipticBelt() {
    // 黃道主圓環 (Ecliptic Circle)
    const eclipticPts = [];
    for (let deg = 0; deg <= 360; deg += 1) {
      eclipticPts.push(eclipticToVector3(deg, 0, GLOBE_RADIUS));
    }
    const eclGeo = new THREE.BufferGeometry().setFromPoints(eclipticPts);
    const eclMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.95
    });
    this.eclipticGroup.add(new THREE.Line(eclGeo, eclMat));

    // 黃道帶 (Zodiac Belt：黃緯 -8° ~ +8° 的半透明金色環帶與上下邊界)
    for (const beta of [-8, 8]) {
      const borderPts = [];
      for (let deg = 0; deg <= 360; deg += 2) {
        borderPts.push(eclipticToVector3(deg, beta, GLOBE_RADIUS));
      }
      const bGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
      const bMat = new THREE.LineDashedMaterial({
        color: 0xd97706,
        dashSize: 2,
        gapSize: 1.5,
        transparent: true,
        opacity: 0.45
      });
      const line = new THREE.Line(bGeo, bMat);
      line.computeLineDistances();
      this.eclipticGroup.add(line);
    }

    // 黃道十二宮每 30° 分界刻度線
    ZODIAC_CONSTELLATIONS.forEach((sign) => {
      const divPts = [];
      for (let b = -8; b <= 8; b += 2) {
        divPts.push(eclipticToVector3(sign.eclipticStart, b, GLOBE_RADIUS));
      }
      const divGeo = new THREE.BufferGeometry().setFromPoints(divPts);
      const divMat = new THREE.LineBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.65
      });
      this.eclipticGroup.add(new THREE.Line(divGeo, divMat));
    });

    // 四大二分二至點標記 (春分、夏至、秋分、冬至)
    const cardinalEcliptic = [
      { deg: 0, text: '春分點 Vernal Equinox (0°)' },
      { deg: 90, text: '夏至點 Summer Solstice (90°)' },
      { deg: 180, text: '秋分點 Autumnal Equinox (180°)' },
      { deg: 270, text: '冬至點 Winter Solstice (270°)' }
    ];
    cardinalEcliptic.forEach((pt) => {
      const pos = eclipticToVector3(pt.deg, 0, GLOBE_RADIUS);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfde047 })
      );
      dot.position.copy(pos);
      this.eclipticGroup.add(dot);
    });
  }

  _buildConstellations() {
    // 1. 黃道十二宮星座 (高亮金色連線與恆星)
    ZODIAC_CONSTELLATIONS.forEach((constellation) => {
      this._addConstellationToGroup(constellation, this.zodiacGroup, true);
    });

    // 2. 其他重要指標星座 (青藍色連線)
    OTHER_CONSTELLATIONS.forEach((constellation) => {
      this._addConstellationToGroup(constellation, this.otherConstGroup, false);
    });
  }

  _addConstellationToGroup(c, targetGroup, isZodiac) {
    const cGroup = new THREE.Group();
    const starVectors = [];
    const centerSum = new THREE.Vector3();

    c.stars.forEach((star) => {
      const pos = raDecToVector3(star.ra, star.dec, GLOBE_RADIUS);
      starVectors.push(pos);
      centerSum.add(pos);

      // 依視星等決定恆星球體大小
      const radius = Math.max(0.55, 1.85 - star.mag * 0.3);
      const starGeo = new THREE.SphereGeometry(radius, 14, 14);
      const starMat = new THREE.MeshBasicMaterial({
        color: isZodiac ? 0xfef08a : 0xbae6fd
      });
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.copy(pos);

      starMesh.userData = {
        type: 'Star',
        constellationId: c.id,
        title: `✦ ${star.name}`,
        subtitle: `所屬星座：${c.symbol ? c.symbol + ' ' : ''}${c.nameZh} (${c.nameEn})`,
        details: `赤經 RA: ${formatRA(star.ra)} | 赤緯 Dec: ${star.dec.toFixed(2)}° | 視星等: ${star.mag} 等\n${c.desc}`
      };

      this.pickables.push(starMesh);
      cGroup.add(starMesh);
    });

    // 星座連線
    const linePts = [];
    c.lines.forEach(([i, j]) => {
      if (starVectors[i] && starVectors[j]) {
        linePts.push(starVectors[i], starVectors[j]);
      }
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lineMat = new THREE.LineBasicMaterial({
      color: isZodiac ? 0xf59e0b : 0x38bdf8,
      transparent: true,
      opacity: isZodiac ? 0.88 : 0.55
    });
    cGroup.add(new THREE.LineSegments(lineGeo, lineMat));

    // 星座繁體中文（附英文對照）標籤
    const centerPos = centerSum.divideScalar(c.stars.length).normalize().multiplyScalar(GLOBE_RADIUS * 1.03);
    const labelHtml = isZodiac
      ? `${c.symbol} ${c.nameZh} <small>${c.nameEn}</small>`
      : `${c.nameZh} <small>${c.nameEn}</small>`;

    const labelObj = this._createLabel(
      centerPos,
      labelHtml,
      isZodiac ? 'celestial-label zodiac-label' : 'celestial-label',
      cGroup,
      () => {
        if (this.onSelectObject) {
          this.onSelectObject({
            type: 'Constellation',
            constellationId: c.id,
            title: `${c.symbol ? c.symbol + ' ' : ''}${c.nameZh} (${c.nameEn})`,
            subtitle: isZodiac ? `黃道十二宮 | 黃經起始 ${c.eclipticStart}°` : '全天代表指標星座',
            details: c.desc,
            direction: centerPos.clone().normalize()
          });
        }
      }
    );
    c.centerDirection = centerPos.clone().normalize();
    c.labelObject = labelObj;

    targetGroup.add(cGroup);
  }

  _buildObserverHorizon() {
    // 1. 地平面切面以上的天球上半球 (y >= 0)：採用亮一點的天空藍，代表觀測者可見的地上蒼穹
    const upperDomeGeo = new THREE.SphereGeometry(
      GLOBE_RADIUS * 0.995,
      64,
      32,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const upperDomeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // 亮天空藍 (Bright Sky Blue)
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.upperDomeMesh = new THREE.Mesh(upperDomeGeo, upperDomeMat);
    this.horizonGroup.add(this.upperDomeMesh);

    // 2. 地平面切面以下的天球下半球 (y <= 0)：採用夜幕灰，代表隱沒於地平線之下的地下天球
    const lowerDomeGeo = new THREE.SphereGeometry(
      GLOBE_RADIUS * 0.995,
      64,
      32,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2
    );
    const lowerDomeMat = new THREE.MeshBasicMaterial({
      color: 0x475569, // 夜幕灰 (Night Curtain Slate Gray)
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.lowerDomeMesh = new THREE.Mesh(lowerDomeGeo, lowerDomeMat);
    this.horizonGroup.add(this.lowerDomeMesh);

    // 3. 觀測者地平面切面圓盤 (隨經緯度與恆星時旋轉法向量指向當地天頂 Zenith)
    const ringGeo = new THREE.RingGeometry(EARTH_RADIUS + 0.8, GLOBE_RADIUS * 0.995, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.horizonGroup.add(ringMesh);

    // 地平圈邊界線
    const borderPts = [];
    for (let a = 0; a <= 360; a += 3) {
      const rad = THREE.MathUtils.degToRad(a);
      borderPts.push(new THREE.Vector3(Math.cos(rad) * GLOBE_RADIUS * 0.995, 0, Math.sin(rad) * GLOBE_RADIUS * 0.995));
    }
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.75
    });
    this.horizonGroup.add(new THREE.Line(borderGeo, borderMat));

    // 天頂向量箭頭軸線 (Zenith Normal Axis，垂直於地平面切面)
    const zenithPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, GLOBE_RADIUS * 1.03, 0)];
    const zenithGeo = new THREE.BufferGeometry().setFromPoints(zenithPts);
    const zenithMat = new THREE.LineDashedMaterial({
      color: 0x34d399,
      dashSize: 2,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.85
    });
    const zenithLine = new THREE.Line(zenithGeo, zenithMat);
    zenithLine.computeLineDistances();
    this.horizonGroup.add(zenithLine);

    // 4. 天頂 3D 旋轉軸頂錐與環形旋轉指標 (可點擊對著垂直地平面切面的天頂軸作 90° 旋轉)
    const zenithCapGroup = new THREE.Group();
    zenithCapGroup.position.set(0, GLOBE_RADIUS * 1.01, 0);

    const coneGeo = new THREE.ConeGeometry(1.4, 3.2, 18);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.position.set(0, 1.2, 0);
    coneMesh.userData = { isZenithRotator: true };
    this.pickables.push(coneMesh);
    zenithCapGroup.add(coneMesh);

    const torusGeo = new THREE.TorusGeometry(3.2, 0.32, 12, 32, Math.PI * 1.65);
    torusGeo.rotateX(Math.PI / 2);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    this.zenithRingMesh = new THREE.Mesh(torusGeo, torusMat);
    this.zenithRingMesh.userData = { isZenithRotator: true };
    this.pickables.push(this.zenithRingMesh);
    zenithCapGroup.add(this.zenithRingMesh);

    this.horizonGroup.add(zenithCapGroup);

    // 5. 天頂互動式「🔄 旋轉 90°」符號按鈕 (CSS2DObject)
    const rotBtnDiv = document.createElement('div');
    rotBtnDiv.className = 'zenith-rotate-btn';
    rotBtnDiv.title = '點擊使天球繞垂直地平面切面的天頂軸旋轉 90°';
    rotBtnDiv.innerHTML = `<span class="rot-icon">🔄</span> 天頂軸旋轉 +90° <small id="zenith-angle-badge">(0°)</small>`;
    rotBtnDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      this.rotateAroundZenithBy90();
    });
    this.zenithRotateBtnDiv = rotBtnDiv;
    this.zenithRotateLabel = new CSS2DObject(rotBtnDiv);
    this.zenithRotateLabel.position.set(0, GLOBE_RADIUS + 8.5, 0);
    this.horizonGroup.add(this.zenithRotateLabel);
    this.labels.push(this.zenithRotateLabel);
  }

  /**
   * 每次點擊天頂旋轉符號時，使整個天球對著垂直地平面切面的天頂軸 (Zenith Axis) 旋轉 90°
   */
  rotateAroundZenithBy90() {
    this.zenithSpinSteps += 1;
    this.targetZenithAngle = this.zenithSpinSteps * (Math.PI / 2);

    const degNorm = (this.zenithSpinSteps * 90) % 360;
    if (this.zenithRotateBtnDiv) {
      this.zenithRotateBtnDiv.innerHTML = `<span class="rot-icon">🔄</span> 天頂軸旋轉 +90° <small>(${degNorm}°)</small>`;
    }

    if (this.onSelectObject) {
      this.onSelectObject({
        type: 'ZenithRotation',
        title: '🔄 天頂軸 90° 旋轉 (Zenith Axis 90° Rotation)',
        subtitle: `垂直地平面切面法線軸 ｜ 目前累計旋轉角度：${degNorm}°`,
        details:
          '以觀測者天頂（Zenith，垂直於地平面切面的法線軸）為旋轉軸心，將天球每次旋轉 90°。\n旋轉過程中地平面切面保持原有傾角平面不變，方便您依序從東、南、西、北四個不同方位側面檢視天球上的黃道十二宮與星座。'
      });
    }
  }

  /**
   * 於每幀平滑插值天球繞天頂軸的 90° 旋轉動畫
   */
  animateZenithRotation() {
    const diff = this.targetZenithAngle - this.currentZenithAngle;
    if (Math.abs(diff) > 0.0005) {
      this.currentZenithAngle += diff * 0.14;
      if (this.zenithRingMesh) {
        this.zenithRingMesh.rotation.y += 0.12;
      }
    } else {
      this.currentZenithAngle = this.targetZenithAngle;
    }
    this.group.quaternion.setFromAxisAngle(this.zenithVec, this.currentZenithAngle);
  }

  _buildDynamicSkyBodies() {
    // 太陽在天球黃道上的投影
    const sunGeo = new THREE.SphereGeometry(2.6, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.pickables.push(this.sunMesh);
    this.dynamicBodiesGroup.add(this.sunMesh);

    this.sunLabel = this._createLabel(
      new THREE.Vector3(),
      '☀ 太陽 <small>Sun</small>',
      'celestial-label zodiac-label',
      this.dynamicBodiesGroup,
      () => this.onSelectObject && this.onSelectObject(this.sunMesh.userData)
    );

    // 月球在天球上的投影
    const moonGeo = new THREE.SphereGeometry(1.9, 20, 20);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.pickables.push(this.moonMesh);
    this.dynamicBodiesGroup.add(this.moonMesh);

    this.moonLabel = this._createLabel(
      new THREE.Vector3(),
      '🌙 月球 <small>Moon</small>',
      'celestial-label planet-label',
      this.dynamicBodiesGroup,
      () => this.onSelectObject && this.onSelectObject(this.moonMesh.userData)
    );
  }

  _createLabel(position, htmlContent, className, parentGroup, onClick = null) {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = htmlContent;
    if (onClick) {
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
    }
    const label = new CSS2DObject(div);
    label.position.copy(position);
    parentGroup.add(label);
    this.labels.push(label);
    return label;
  }

  setLayerVisibility(options) {
    if (options.zodiac !== undefined) this.zodiacGroup.visible = options.zodiac;
    if (options.ecliptic !== undefined) this.eclipticGroup.visible = options.ecliptic;
    if (options.equator !== undefined) this.equatorGroup.visible = options.equator;
    if (options.otherConst !== undefined) this.otherConstGroup.visible = options.otherConst;
    if (options.horizonPlane !== undefined) {
      this.horizonGroup.visible = options.horizonPlane;
      if (this.zenithRotateLabel) {
        this.zenithRotateLabel.element.style.display = options.horizonPlane ? '' : 'none';
      }
    }
    if (options.labels !== undefined) {
      this.labels.forEach((lbl) => {
        if (lbl === this.zenithRotateLabel) {
          lbl.element.style.display = this.horizonGroup.visible ? '' : 'none';
        } else {
          lbl.element.style.display = options.labels ? '' : 'none';
        }
      });
    }
  }

  update(ephemeris) {
    // 1. 根據格林威治恆星時 (GST) 旋轉中心地球：
    // 在 Three.js SphereGeometry 中，經度 0° (格林威治) 位於 +X 軸，東經 +90°E 位於 -Z 軸。
    // 當地球繞 +Y 軸正向旋轉 gstRad 時，格林威治子午線指向赤經 RA = GST，
    // 而地球表面上任意經度 lon、緯度 lat 的地點（例如台灣/布柳之家 121°E, 24.8°N），
    // 其世界座標法向量恰好指向赤經 RA = GST + lon = LST（地方恆星時）、赤緯 Dec = lat（當地天頂 Zenith）！
    const gstRad = THREE.MathUtils.degToRad(ephemeris.gstHours * 15);
    this.earthMesh.rotation.y = gstRad;

    const latRad = THREE.MathUtils.degToRad(ephemeris.lat);
    const lonRad = THREE.MathUtils.degToRad(ephemeris.lon);
    const rPin = EARTH_RADIUS + 0.12;
    this.observerPin.position.set(
      rPin * Math.cos(latRad) * Math.cos(lonRad),
      rPin * Math.sin(latRad),
      -rPin * Math.cos(latRad) * Math.sin(lonRad)
    );

    this.earthMesh.userData = {
      type: 'Body',
      title: '🌍 地球 (Earth - 天球中心)',
      subtitle: `觀測點 (${ephemeris.lat.toFixed(2)}°N, ${ephemeris.lon.toFixed(2)}°E) | 地方恆星時 ${formatRA(ephemeris.lstHours)}`,
      details: `格林威治恆星時 GST: ${formatRA(ephemeris.gstHours)}\n地球自轉姿態與日照晝夜半球完全依據目前輸入的日期時間與經緯度即時計算。`
    };

    // 2. 更新觀測者地平面切面方向 (當地天頂 Zenith 的赤經 = LST, 赤緯 = Lat)
    this.zenithVec.copy(raDecToVector3(ephemeris.lstHours, ephemeris.lat, 1).normalize());
    const upDefault = new THREE.Vector3(0, 1, 0);
    this.horizonGroup.quaternion.setFromUnitVectors(upDefault, this.zenithVec);
    this.group.quaternion.setFromAxisAngle(this.zenithVec, this.currentZenithAngle);

    // 3. 更新太陽在天球與黃道上的位置，並同步地球日照光源方向（真實呈現地球向陽面白晝與背陽面黑夜）
    const sunPos = raDecToVector3(ephemeris.sun.ra, ephemeris.sun.dec, GLOBE_RADIUS * 0.99);
    this.sunMesh.position.copy(sunPos);
    this.sunLabel.position.copy(sunPos.clone().multiplyScalar(1.04));
    this.earthSunLight.position.copy(sunPos);
    this.sunMesh.userData = {
      type: 'Body',
      title: '☀ 太陽 (Sun)',
      subtitle: `位於 ${ephemeris.sun.zodiac.symbol} ${ephemeris.sun.zodiac.nameZh} (${ephemeris.sun.zodiac.nameEn})`,
      details: `黃經: ${ephemeris.sun.elon.toFixed(2)}° | 赤經: ${formatRA(ephemeris.sun.ra)} | 赤緯: ${ephemeris.sun.dec.toFixed(2)}°\n當地地平仰角: ${ephemeris.sun.altitude.toFixed(1)}° | 方位角: ${ephemeris.sun.azimuth.toFixed(1)}°`
    };

    // 4. 更新月球在天球上的位置
    const moonPos = raDecToVector3(ephemeris.moon.ra, ephemeris.moon.dec, GLOBE_RADIUS * 0.96);
    this.moonMesh.position.copy(moonPos);
    this.moonLabel.position.copy(moonPos.clone().multiplyScalar(1.04));
    this.moonMesh.userData = {
      type: 'Body',
      title: '🌙 月球 (Moon)',
      subtitle: `${ephemeris.moon.phaseName} (照明率 ${(ephemeris.moon.fraction * 100).toFixed(1)}%)`,
      details: `赤經: ${formatRA(ephemeris.moon.ra)} | 赤緯: ${ephemeris.moon.dec.toFixed(2)}°\n當地地平仰角: ${ephemeris.moon.altitude.toFixed(1)}° | 方位角: ${ephemeris.moon.azimuth.toFixed(1)}°`
    };

    // 5. 更新各大行星在天球黃道帶上的位置
    ephemeris.geocentricPlanets.forEach((p) => {
      if (!this.planetMeshes[p.id]) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.35, 16, 16),
          new THREE.MeshBasicMaterial({ color: p.color })
        );
        this.pickables.push(mesh);
        this.dynamicBodiesGroup.add(mesh);

        const lbl = this._createLabel(
          new THREE.Vector3(),
          `${p.symbol} ${p.nameZh} <small>${p.nameEn}</small>`,
          'celestial-label planet-label',
          this.dynamicBodiesGroup,
          () => this.onSelectObject && this.onSelectObject(mesh.userData)
        );
        this.planetMeshes[p.id] = { mesh, lbl };
      }

      const { mesh, lbl } = this.planetMeshes[p.id];
      const pos = raDecToVector3(p.ra, p.dec, GLOBE_RADIUS * 0.985);
      mesh.position.copy(pos);
      lbl.position.copy(pos.clone().multiplyScalar(1.04));
      mesh.userData = {
        type: 'Planet',
        title: `${p.symbol} ${p.nameZh} (${p.nameEn})`,
        subtitle: `距離地球 ${p.distAU.toFixed(2)} AU`,
        details: `赤經: ${formatRA(p.ra)} | 赤緯: ${p.dec.toFixed(2)}°\n當地地平仰角: ${p.altitude.toFixed(1)}° | 方位角: ${p.azimuth.toFixed(1)}°`
      };
    });
  }
}
