import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ZODIAC_CONSTELLATIONS, OTHER_CONSTELLATIONS } from '../data/zodiacData.js';
import {
  raDecToVector3,
  eclipticToVector3,
  OBLIQUITY_RAD,
  formatRA
} from '../utils/astronomy.js';

const GLOBE_RADIUS = 100;

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

    // 中心地球球體
    const geo = new THREE.SphereGeometry(5.5, 48, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      emissive: 0x0a192f,
      roughness: 0.55,
      metalness: 0.1
    });
    this.earthMesh = new THREE.Mesh(geo, mat);
    this.earthMesh.userData = {
      type: 'Body',
      title: '🌍 地球 (Earth - 天球中心)',
      subtitle: 'Geocentric Celestial Center',
      details: '在天球儀 (Level 1) 尺度下，地球位於天球正中央，假想所有恆星與黃道十二宮投影於外層天球表面上。'
    };
    this.pickables.push(this.earthMesh);
    earthGroup.add(this.earthMesh);

    // 地球經緯網線裝飾
    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(5.56, 16, 12));
    const wireMat = new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.35 });
    this.earthMesh.add(new THREE.LineSegments(wireGeo, wireMat));

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

    // 觀測者地表釘選點
    const pinGeo = new THREE.SphereGeometry(0.42, 16, 16);
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
    // 半透明外層天球殼
    const shellGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 48, 32);
    const shellMat = new THREE.MeshBasicMaterial({
      color: 0x1e3a8a,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.equatorGroup.add(new THREE.Mesh(shellGeo, shellMat));

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
    // 觀測者地平面切面圓盤 (隨經緯度與恆星時旋轉法向量指向當地天頂 Zenith)
    const ringGeo = new THREE.RingGeometry(6.2, GLOBE_RADIUS * 0.98, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.horizonGroup.add(ringMesh);

    // 地平圈邊界線
    const borderPts = [];
    for (let a = 0; a <= 360; a += 3) {
      const rad = THREE.MathUtils.degToRad(a);
      borderPts.push(new THREE.Vector3(Math.cos(rad) * GLOBE_RADIUS * 0.98, 0, Math.sin(rad) * GLOBE_RADIUS * 0.98));
    }
    const borderGeo = new THREE.BufferGeometry().setFromPoints(borderPts);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.6
    });
    this.horizonGroup.add(new THREE.Line(borderGeo, borderMat));

    // 天頂向量箭頭 (Zenith Arrow)
    const zenithPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, GLOBE_RADIUS * 0.98, 0)];
    const zenithGeo = new THREE.BufferGeometry().setFromPoints(zenithPts);
    const zenithMat = new THREE.LineDashedMaterial({
      color: 0x34d399,
      dashSize: 2,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.75
    });
    const zenithLine = new THREE.Line(zenithGeo, zenithMat);
    zenithLine.computeLineDistances();
    this.horizonGroup.add(zenithLine);
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
    if (options.horizonPlane !== undefined) this.horizonGroup.visible = options.horizonPlane;
    if (options.labels !== undefined) {
      this.labels.forEach((lbl) => {
        lbl.element.style.display = options.labels ? '' : 'none';
      });
    }
  }

  update(ephemeris) {
    // 1. 根據格林威治恆星時旋轉中心地球，並標出觀測者經緯度位置
    const gstRad = THREE.MathUtils.degToRad(ephemeris.gstHours * 15);
    this.earthMesh.rotation.y = gstRad;

    const latRad = THREE.MathUtils.degToRad(ephemeris.lat);
    const lonRad = THREE.MathUtils.degToRad(ephemeris.lon);
    const rPin = 5.65;
    this.observerPin.position.set(
      rPin * Math.cos(latRad) * Math.cos(lonRad),
      rPin * Math.sin(latRad),
      -rPin * Math.cos(latRad) * Math.sin(lonRad)
    );

    // 2. 更新觀測者地平面切面方向 (當地天頂 Zenith 的赤經 = LST, 赤緯 = Lat)
    const zenithVec = raDecToVector3(ephemeris.lstHours, ephemeris.lat, 1).normalize();
    const upDefault = new THREE.Vector3(0, 1, 0);
    this.horizonGroup.quaternion.setFromUnitVectors(upDefault, zenithVec);

    // 3. 更新太陽在天球與黃道上的位置
    const sunPos = raDecToVector3(ephemeris.sun.ra, ephemeris.sun.dec, GLOBE_RADIUS * 0.99);
    this.sunMesh.position.copy(sunPos);
    this.sunLabel.position.copy(sunPos.clone().multiplyScalar(1.04));
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
