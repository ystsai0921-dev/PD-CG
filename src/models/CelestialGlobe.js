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

export const CONSTELLATION_ART_CONFIG = {
  Aquila: { file: 'aquila.png', rotRad: 0.119, scale: 57.3 },
  Andromeda: { file: 'andromeda.png', rotRad: 1.8916, scale: 57.6 },
  Libra: { file: 'libra.png', rotRad: 1.0013, scale: 38.0 },
  Aries: { file: 'aries.png', rotRad: 0.8898, scale: 35.0 },
  Bootes: { file: 'bootes.png', rotRad: -1.0719, scale: 70.9 },
  Cancer: { file: 'cancer.png', rotRad: -0.6372, scale: 42.0 },
  Capricornus: { file: 'capricornus.png', rotRad: 0.6707, scale: 38.0 },
  Carina: { file: 'argonavis.png', rotRad: 0.2686, scale: 89.1 },
  Cassiopeia: { file: 'cassiopeia.png', rotRad: -3.129, scale: 42.0 },
  Centaurus: { file: 'centaurus.png', rotRad: 0.4711, scale: 71.4 },
  Cepheus: { file: 'cepheus.png', rotRad: 1.9138, scale: 55.4 },
  Auriga: { file: 'auriga.png', rotRad: -0.9179, scale: 48.0 },
  Corvus: { file: 'corvus.png', rotRad: 0.2208, scale: 26.0 },
  Crux: { file: 'crux.png', rotRad: -0.8775, scale: 22.0 },
  Cygnus: { file: 'cygnus.png', rotRad: -0.1495, scale: 55.6 },
  Gemini: { file: 'gemini.png', rotRad: -0.3234, scale: 44.0 },
  CanisMajor: { file: 'canis-major.png', rotRad: -0.3692, scale: 42.0 },
  UrsaMajor: { file: 'ursa-major.png', rotRad: -0.7283, scale: 85.0 },
  Leo: { file: 'leo.png', rotRad: 0.7031, scale: 61.4 },
  Lyra: { file: 'lyra.png', rotRad: 0.3002, scale: 26.0 },
  Orion: { file: 'orion.png', rotRad: 0.4711, scale: 52.0 },
  Pegasus: { file: 'pegasus.png', rotRad: 2.476, scale: 78.7 },
  Perseus: { file: 'perseus.png', rotRad: -0.2026, scale: 52.0 },
  CanisMinor: { file: 'canis-minor.png', rotRad: -0.2699, scale: 28.0 },
  UrsaMinor: { file: 'ursa-minor.png', rotRad: 1.4637, scale: 35.0 },
  Pisces: { file: 'pisces.png', rotRad: 0.6606, scale: 70.8 },
  Sagittarius: { file: 'sagittarius.png', rotRad: 0.488, scale: 52.0 },
  Scorpius: { file: 'scorpius.png', rotRad: -0.0217, scale: 48.0 },
  Taurus: { file: 'taurus.png', rotRad: -0.3605, scale: 58.1 },
  Aquarius: { file: 'aquarius.png', rotRad: 0.6697, scale: 64.6 },
  Virgo: { file: 'virgo.png', rotRad: 0.6022, scale: 77.4 }
};

export const CONSTELLATION_ART_MAP = Object.fromEntries(
  Object.entries(CONSTELLATION_ART_CONFIG).map(([k, v]) => [k, v.file])
);

const GLOBE_RADIUS = 100;
const EARTH_RADIUS = 6.48; // 地球模型大小縮小 10% (原 7.2 -> 6.48)

/**
 * 計算將天球赤道座標系 (Equatorial System: +Y 北天極 NCP, +X 春分點, -Z RA=6h)
 * 旋轉至當地地平座標系 (Horizontal System: +Y 天頂 Zenith, -Z 正北 True North, +X 正東 East, +Z 正南 South, -X 正西 West)
 * 的嚴格正交四元數旋轉變換。
 */
function getEquatorialToHorizontalQuaternion(lstHours, latDeg) {
  const z_eq = raDecToVector3(lstHours, latDeg, 1).normalize();
  const p_eq = new THREE.Vector3(0, 1, 0); // 北天極 NCP
  const dp = p_eq.dot(z_eq);
  const n_proj = new THREE.Vector3().subVectors(p_eq, z_eq.clone().multiplyScalar(dp));
  let n_eq;
  if (n_proj.lengthSq() < 1e-10) {
    n_eq = new THREE.Vector3(0, 0, -1);
  } else {
    n_eq = n_proj.normalize();
  }
  const e_eq = new THREE.Vector3().crossVectors(n_eq, z_eq).normalize();

  const m = new THREE.Matrix4().set(
    e_eq.x, e_eq.y, e_eq.z, 0,
    z_eq.x, z_eq.y, z_eq.z, 0,
    -n_eq.x, -n_eq.y, -n_eq.z, 0,
    0, 0, 0, 1
  );
  return new THREE.Quaternion().setFromRotationMatrix(m);
}

export class CelestialGlobeModel {
  constructor(onSelectObject, onHoverObject = null, onClearHover = null) {
    this.group = new THREE.Group();
    this.onSelectObject = onSelectObject;
    this.onHoverObject = onHoverObject;
    this.onClearHover = onClearHover;
    this.hoveredConstellationId = null;
    this.hoveredBodyId = null;
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
    this.constellationMap = {};
    this.dynamicBodyMap = {};
    this.starDetailLabels = [];
    this.cardinalLabels = [];
    this.activeHighlight = null;
    this.flashWhiteColor = new THREE.Color(0xffffff);
    this.flashGoldColor = new THREE.Color(0xfde047);
    this.textureLoader = new THREE.TextureLoader();

    this.zenithVec = new THREE.Vector3(0, 1, 0);
    this.zenithToWorldUpQuat = new THREE.Quaternion();
    this.zenithSpinSteps = 0;
    this.currentZenithAngle = 0;
    this.targetZenithAngle = 0;

    // L1 視角狀態與地平半球裁切平面 (世界座標 Y >= 0 為地平面以上可見天球蒼穹)
    this.isHorizonTop = false;
    this.showLabelsOption = true;
    this.showHorizonOption = true;
    this.currentEphemeris = null;
    this.horizonClipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

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
    this.earthGroup = earthGroup;

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
      emissiveIntensity: 0.32,
      transparent: true,
      opacity: 1.0
    });
    this.earthMat = mat;
    this.earthMesh = new THREE.Mesh(geo, mat);
    this.earthMesh.userData = {
      type: 'Body',
      bodyId: 'Earth',
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
    this.earthAtmoMat = atmoMat;
    this.earthAtmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    this.earthMesh.add(this.earthAtmoMesh);

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
    this.earthAxisLine = new THREE.Line(axisGeo, axisMat);
    this.earthAxisLine.computeLineDistances();
    earthGroup.add(this.earthAxisLine);

    // 觀測者地表釘選點與法線立標 (隨輸入經緯度精準定位於地球陸地表面)
    const pinGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 1.0 });
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

    this.baseStarfieldOpacity = 0.65;
    this.starfieldMat = new THREE.PointsMaterial({
      size: 1.15,
      vertexColors: true,
      transparent: true,
      opacity: this.baseStarfieldOpacity
    });

    this.group.add(new THREE.Points(geo, this.starfieldMat));
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
    this.ncpLabel = this._createLabel(
      new THREE.Vector3(0, GLOBE_RADIUS + 3, 0),
      '北天極 NCP (+90°)',
      'celestial-label',
      this.equatorGroup
    );
    this.scpLabel = this._createLabel(
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
    const starEntries = [];

    // 預先組裝該星座所有恆星的名字、視星等與赤道座標清單 HTML（供左下角詳情欄與點擊星座時呈現）
    const starItemsHtml = c.stars
      .map(
        (st) => `
        <div class="const-star-item">
          <b>✦ ${st.name}</b> ｜ 視星等：<b>${st.mag} 等</b><br/>
          赤經 RA: ${formatRA(st.ra)} ｜ 赤緯 Dec: ${st.dec >= 0 ? '+' : ''}${st.dec.toFixed(2)}°
        </div>`
      )
      .join('');
    const starListExtraHtml = `
      <div class="const-star-list">
        <div style="color:#fde68a; font-weight:700; margin-bottom:2px;">✦ ${c.nameZh}主要恆星與視星等 (${c.stars.length} 顆)：</div>
        ${starItemsHtml}
      </div>
    `;

    c.stars.forEach((star) => {
      const pos = raDecToVector3(star.ra, star.dec, GLOBE_RADIUS);
      starVectors.push(pos);
      centerSum.add(pos);

      // 依視星等決定恆星球體大小
      const radius = Math.max(0.55, 1.85 - star.mag * 0.3);
      const baseColorHex = isZodiac ? 0xfef08a : 0xbae6fd;
      const starGeo = new THREE.SphereGeometry(radius, 14, 14);
      const starMat = new THREE.MeshBasicMaterial({
        color: baseColorHex,
        transparent: true,
        opacity: 1.0
      });
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.copy(pos);

      // 恆星閃爍高亮外光暈球 (預設隱藏，當點選該星座或該恆星時啟動閃爍)
      const haloGeo = new THREE.SphereGeometry(radius * 2.5, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const haloMesh = new THREE.Mesh(haloGeo, haloMat);
      haloMesh.visible = false;
      starMesh.add(haloMesh);

      starMesh.userData = {
        type: 'Star',
        constellationId: c.id,
        starName: star.name,
        title: `✦ ${star.name}`,
        subtitle: `所屬星座：${c.symbol ? c.symbol + ' ' : ''}${c.nameZh} (${c.nameEn}) ｜ 視星等 ${star.mag} 等`,
        details: `赤經 RA: ${formatRA(star.ra)} | 赤緯 Dec: ${star.dec.toFixed(2)}° | 視星等: ${star.mag} 等\n${c.desc}`,
        extraHtml: starListExtraHtml
      };

      // 建立該顆恆星專屬的 3D 名字與星等標籤 (預設 detailLabel.visible = false 完全隱藏，僅在點擊該星座時才顯現)
      const detailDiv = document.createElement('div');
      detailDiv.className = 'star-detail-label';
      detailDiv.style.display = 'none';
      detailDiv.innerHTML = `✦ ${star.name} <span class="star-mag-tag">${star.mag}等</span>`;
      detailDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectStar(starMesh.userData);
      });
      const detailLabel = new CSS2DObject(detailDiv);
      detailLabel.position.copy(pos.clone().multiplyScalar(1.015));
      detailLabel.visible = false;
      cGroup.add(detailLabel);
      this.starDetailLabels.push(detailLabel);

      starEntries.push({
        star,
        mesh: starMesh,
        haloMesh,
        detailLabel,
        baseColorHex,
        baseColorObj: new THREE.Color(baseColorHex)
      });

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
    const baseLineColorHex = isZodiac ? 0xf59e0b : 0x38bdf8;
    const baseLineOpacity = isZodiac ? 0.88 : 0.55;
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const lineMat = new THREE.LineBasicMaterial({
      color: baseLineColorHex,
      transparent: true,
      opacity: baseLineOpacity
    });
    cGroup.add(new THREE.LineSegments(lineGeo, lineMat));

    // L1 預設僅簡潔表示星座名（點擊後才閃爍、適度 Zoom-in 並顯現各顆恆星名字與詳細資訊）
    const centerDir = centerSum.divideScalar(c.stars.length).normalize();
    const centerSpherePos = centerDir.clone().multiplyScalar(GLOBE_RADIUS);
    const centerPos = centerDir.clone().multiplyScalar(GLOBE_RADIUS * 1.03);

    // 計算該星群各恆星與中心的張角跨距，決定適度 Zoom-in 的最佳觀測距離（星群越緊密則拉越近，確保能清楚辨析各恆星）
    let maxSpread = 0;
    starEntries.forEach((sEntry, idx) => {
      const starPos = starVectors[idx];
      const dist = starPos.distanceTo(centerSpherePos);
      if (dist > maxSpread) maxSpread = dist;

      // 將各恆星標籤往星群外圍大幅扇形推開，徹底避開恆星本體與星座連線
      let outward = new THREE.Vector3().subVectors(starPos, centerSpherePos);
      const normalStar = starPos.clone().normalize();
      outward.sub(normalStar.clone().multiplyScalar(outward.dot(normalStar)));
      if (outward.lengthSq() > 1e-4) {
        outward.normalize().multiplyScalar(6.5);
      } else {
        outward.set(0, 5.5, 0);
      }
      sEntry.detailLabel.position.copy(starPos.clone().multiplyScalar(1.025).add(outward));
    });

    // 預設天球距離約 228，適度 Zoom-in 距離介於 145 ~ 168（視星群跨距自動調整）
    const zoomDistance = Math.round(Math.max(145, Math.min(168, GLOBE_RADIUS + 38 + maxSpread * 1.35)));

    const cleanNameZh = c.nameZh.split('（')[0].trim();
    const pureNameZh = isZodiac ? `${c.symbol} ${cleanNameZh}` : cleanNameZh;
    const fullDisplayName = `${c.symbol ? c.symbol + ' ' : ''}${c.nameZh}`;
    const conciseLabelHtml = pureNameZh;
    const expandedLabelHtml = isZodiac
      ? `${c.symbol} ${c.nameZh} <small>${c.nameEn}</small>`
      : `${c.nameZh} <small>${c.nameEn}</small>`;

    const zodiacIndex = ZODIAC_CONSTELLATIONS.findIndex((z) => z.id === c.id);
    const categoryText = isZodiac
      ? `黃道第 ${zodiacIndex + 1} 宮 ｜ 黃經 ${c.eclipticStart}° ~ ${c.eclipticStart + 30}°`
      : '全天重要代表星座';
    const mainStar = c.stars && c.stars[0] ? `主星：${c.stars[0].name.split(' (')[0]} (${c.stars[0].mag}等)` : '';
    const starMeta = mainStar ? `${mainStar} ｜ 共 ${c.stars.length} 顆主要亮星` : `共 ${c.stars.length} 顆主要亮星`;

    // 畫面簡潔設計：預設僅顯現簡短名稱，滑鼠 hover 懸停時才展開進一步卡片資訊
    const labelInnerHtml = `
      <span class="const-label-text">${pureNameZh}</span>
      <div class="const-hover-card">
        <div class="hover-title">
          <span>${fullDisplayName}</span>
          <small>${c.nameEn}</small>
        </div>
        <div class="hover-meta">${categoryText}</div>
        <div class="hover-meta-sub">${starMeta}</div>
        <div class="hover-desc">${c.desc}</div>
        <div class="hover-tip">💡 點擊以放大聚焦此星群</div>
      </div>
    `;

    const constSelectInfo = {
      type: 'Constellation',
      constellationId: c.id,
      title: `${c.symbol ? c.symbol + ' ' : ''}${c.nameZh} (${c.nameEn})`,
      subtitle: isZodiac ? `黃道十二宮 | 黃經起始 ${c.eclipticStart}° | 共 ${c.stars.length} 顆主要亮星` : `全天代表指標星座 | 共 ${c.stars.length} 顆主要亮星`,
      details: `${c.desc}（按 Esc 鍵可退出閃爍高亮狀態並恢復視角）`,
      extraHtml: starListExtraHtml,
      direction: centerDir.clone(),
      zoomDistance
    };

    const labelObj = this._createLabel(
      centerPos,
      labelInnerHtml,
      isZodiac ? 'celestial-label zodiac-label' : 'celestial-label',
      cGroup,
      () => this.selectConstellation(c.id),
      () => this.hoverConstellation(c.id),
      () => this.clearHover()
    );
    c.centerDirection = centerDir.clone();
    c.zoomDistance = zoomDistance;
    c.labelObject = labelObj;

    // 建立星座背後 3D 古典意象插圖網格 (Constellation Artwork Mesh)
    const artCfg = CONSTELLATION_ART_CONFIG[c.id];
    let artMesh = null;
    let artMat = null;

    if (artCfg) {
      const artSize = artCfg.scale || Math.max(48, Math.min(115, maxSpread * 2.35 + 14));
      const artGeo = new THREE.PlaneGeometry(artSize, artSize);

      const texture = this.textureLoader.load(`./public/images/constellations/${artCfg.file}`);

      const artColorHex = isZodiac ? 0xfef08a : 0x7dd3fc;
      artMat = new THREE.MeshBasicMaterial({
        map: texture,
        color: artColorHex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      artMesh = new THREE.Mesh(artGeo, artMat);

      // 位置：恆星與連線在 r = 100，意象圖放置於 r = 97.5（剛好在星座連線正後方）
      artMesh.position.copy(centerDir.clone().multiplyScalar(GLOBE_RADIUS * 0.975));

      // 姿態：法線指向外側 centerDir，上方 (+Y) 指向北天極 NCP 投影方向
      const normal = centerDir.clone().normalize();
      const ncp = new THREE.Vector3(0, 1, 0);
      let upVec = new THREE.Vector3().subVectors(ncp, normal.clone().multiplyScalar(ncp.dot(normal)));
      if (upVec.lengthSq() < 1e-4) {
        upVec = new THREE.Vector3(0, 0, -1);
      } else {
        upVec.normalize();
      }
      const rightVec = new THREE.Vector3().crossVectors(upVec, normal).normalize();
      const basisMat = new THREE.Matrix4().makeBasis(rightVec, upVec, normal);
      artMesh.quaternion.setFromRotationMatrix(basisMat);

      // 水平鏡像翻轉（因天球儀係由球外向球心俯視，東西方位相對於地表仰望呈現鏡像）
      artMesh.scale.set(-1, 1, 1);

      // 套用 Stellarium 標準參考恆星錨點計算出的精確旋轉角，使意象圖神話輪廓與星體排列角度嚴格一致
      if (artCfg.rotRad) {
        artMesh.rotateZ(artCfg.rotRad);
      }

      artMesh.visible = false;
      cGroup.add(artMesh);
    }

    this.constellationMap[c.id] = {
      c,
      group: cGroup,
      artMesh,
      artMat,
      isZodiac,
      starEntries,
      lineMat,
      baseLineColorHex,
      baseLineColorObj: new THREE.Color(baseLineColorHex),
      baseLineOpacity,
      labelObj,
      pureNameZh,
      conciseLabelHtml,
      expandedLabelHtml,
      selectInfo: constSelectInfo
    };

    targetGroup.add(cGroup);
  }

  /**
   * 清除目前天球上所有星座或行星的高亮聚焦狀態，全面復原地球、背景星場、赤道黃道圈與所有星座的原始亮度
   */
  clearHighlight() {
    // 1. 復原背景星場
    if (this.starfieldMat) {
      this.starfieldMat.opacity = this.baseStarfieldOpacity;
    }

    // 2. 復原東南西北方位羅盤、刻度與地平圈系統
    const showHorizon = this.showHorizonOption !== undefined ? this.showHorizonOption : true;
    this.horizonGroup.visible = showHorizon;
    this.cardinalLabels.forEach((lbl) => {
      lbl.visible = showHorizon;
      lbl.element.style.display = showHorizon ? '' : 'none';
    });
    if (this.zenithRotateLabel) {
      const showZenithBtn = !this.isHorizonTop && showHorizon;
      this.zenithRotateLabel.visible = showZenithBtn;
      this.zenithRotateLabel.element.style.display = showZenithBtn ? '' : 'none';
    }
    if (this.upperDomeMesh && this.upperDomeMesh.material) {
      this.upperDomeMesh.material.opacity = 0.25;
    }
    if (this.lowerDomeMesh && this.lowerDomeMesh.material) {
      this.lowerDomeMesh.visible = !this.isHorizonTop && showHorizon;
      this.lowerDomeMesh.material.opacity = 0.34;
    }

    // 3. 復原中心地球與大氣層、地軸、圖釘
    if (this.earthGroup) {
      this.earthGroup.visible = true;
    }
    if (this.earthMesh) {
      this.earthMesh.visible = true;
      if (this.earthMat) {
        this.earthMat.opacity = 1.0;
        this.earthMat.emissiveIntensity = 0.32;
      }
    }
    if (this.earthAtmoMesh) {
      this.earthAtmoMesh.visible = true;
      if (this.earthAtmoMat) {
        this.earthAtmoMat.opacity = 0.14;
      }
    }
    if (this.earthAxisLine) {
      this.earthAxisLine.visible = true;
      if (this.earthAxisLine.material) {
        this.earthAxisLine.material.opacity = 0.45;
      }
    }
    if (this.observerPin) {
      this.observerPin.visible = true;
      if (this.observerPin.material) {
        this.observerPin.material.opacity = 1.0;
      }
    }
    if (this.earthSunLight) {
      this.earthSunLight.visible = true;
    }

    // 4. 復原赤道圈與黃道圈
    this.equatorGroup.visible = true;
    this.equatorGroup.traverse((child) => {
      if (child.isLine && child.material && child.userData.baseOpacity !== undefined) {
        child.material.opacity = child.userData.baseOpacity;
      }
    });
    if (this.ncpLabel) {
      this.ncpLabel.visible = this.showLabelsOption;
      this.ncpLabel.element.style.display = this.showLabelsOption ? '' : 'none';
    }
    if (this.scpLabel) {
      this.scpLabel.visible = this.showLabelsOption;
      this.scpLabel.element.style.display = this.showLabelsOption ? '' : 'none';
    }

    this.eclipticGroup.visible = true;
    this.eclipticGroup.traverse((child) => {
      if ((child.isLine || child.isMesh) && child.material && child.userData.baseOpacity !== undefined) {
        child.material.opacity = child.userData.baseOpacity;
      }
    });

    // 5. 復原動態天體 (太陽、月球、行星)
    this.dynamicBodiesGroup.visible = true;
    Object.values(this.dynamicBodyMap).forEach((b) => {
      if (b.mesh) {
        b.mesh.visible = true;
        if (b.mesh.material) {
          b.mesh.material.opacity = b.mesh.userData.baseOpacity !== undefined ? b.mesh.userData.baseOpacity : 1.0;
        }
        b.mesh.scale.setScalar(1);
        b.mesh.material.color.setHex(b.baseColorHex);
      }
      if (b.haloMesh) {
        b.haloMesh.visible = false;
        b.haloMesh.material.opacity = 0;
      }
      if (b.labelObj && b.labelObj.element) {
        b.labelObj.visible = this.showLabelsOption;
        b.labelObj.element.style.display = this.showLabelsOption ? '' : 'none';
        b.labelObj.element.classList.remove('active-blink-label', 'is-hovered', 'muted-body-label');
        const textEl = b.labelObj.element.querySelector('.const-label-text');
        if (textEl && b.conciseHtml) {
          textEl.innerHTML = b.conciseHtml;
        } else if (b.conciseHtml) {
          b.labelObj.element.innerHTML = b.conciseHtml;
        }
      }
    });

    // 6. 復原所有星座
    Object.values(this.constellationMap).forEach((entry) => {
      if (entry.group) entry.group.visible = true;
      if (entry.artMesh) {
        entry.artMesh.visible = false;
        entry.artMesh.material.opacity = 0;
      }
      if (entry.labelObj && entry.labelObj.element) {
        entry.labelObj.visible = this.showLabelsOption;
        entry.labelObj.element.style.display = this.showLabelsOption ? '' : 'none';
        entry.labelObj.element.classList.remove('active-blink-label', 'muted-constellation-label', 'is-hovered');
        const textEl = entry.labelObj.element.querySelector('.const-label-text');
        if (textEl) {
          textEl.innerHTML = entry.pureNameZh;
        } else {
          entry.labelObj.element.innerHTML = entry.conciseLabelHtml;
        }
      }
      if (entry.lineMat) {
        entry.lineMat.color.setHex(entry.baseLineColorHex);
        entry.lineMat.opacity = entry.baseLineOpacity;
      }
      entry.starEntries.forEach((s) => {
        s.mesh.visible = true;
        s.mesh.scale.setScalar(1);
        s.mesh.material.color.setHex(s.baseColorHex);
        s.mesh.material.opacity = 1.0;
        s.haloMesh.visible = false;
        s.haloMesh.material.opacity = 0;
        s.detailLabel.visible = false;
        s.detailLabel.element.style.display = 'none';
        s.detailLabel.element.classList.remove('is-visible');
      });
    });

    this.activeHighlight = null;

    if (this.isHorizonTop) {
      this.updateHorizonClippedLabels();
    }
  }

  /**
   * 滑鼠懸停至某星座時：畫面維持簡潔，展開該星座的進一步資訊卡片並微幅加亮該星群連線
   */
  hoverConstellation(constellationId) {
    if (this.hoveredConstellationId === constellationId) return;
    this.clearHover();

    const entry = this.constellationMap[constellationId];
    if (!entry) return;
    this.hoveredConstellationId = constellationId;

    if (entry.labelObj && entry.labelObj.element) {
      entry.labelObj.element.classList.add('is-hovered');
    }

    if (!this.activeHighlight || this.activeHighlight.constellationId !== constellationId) {
      entry.lineMat.opacity = 1.0;
      entry.lineMat.color.setHex(entry.isZodiac ? 0xfde047 : 0x7dd3fc);
      entry.starEntries.forEach((s) => {
        s.mesh.scale.setScalar(1.22);
        s.haloMesh.visible = true;
        s.haloMesh.scale.setScalar(1.2);
        s.haloMesh.material.opacity = 0.45;
      });
    }

    if (this.onHoverObject) {
      this.onHoverObject(entry.selectInfo);
    }
  }

  /**
   * 滑鼠懸停至行星、太陽或月球時：展開懸停資訊卡
   */
  hoverBody(bodyId) {
    if (this.hoveredBodyId === bodyId) return;
    this.clearHover();

    const b = this.dynamicBodyMap[bodyId];
    if (!b) return;
    this.hoveredBodyId = bodyId;

    if (b.labelObj && b.labelObj.element) {
      b.labelObj.element.classList.add('is-hovered');
    }
    if (b.mesh && b.mesh.userData && this.onHoverObject) {
      this.onHoverObject(b.mesh.userData);
    }
  }

  /**
   * 滑鼠移開懸停對象：卡片淡出收合，恢復天球乾淨簡潔預設視野
   */
  clearHover() {
    if (!this.hoveredConstellationId && !this.hoveredBodyId) return;

    if (this.hoveredConstellationId) {
      const entry = this.constellationMap[this.hoveredConstellationId];
      if (entry) {
        if (entry.labelObj && entry.labelObj.element) {
          entry.labelObj.element.classList.remove('is-hovered');
        }
        if (!this.activeHighlight || this.activeHighlight.constellationId !== this.hoveredConstellationId) {
          const isMuted = this.activeHighlight && this.activeHighlight.type === 'Constellation';
          entry.lineMat.opacity = isMuted ? entry.baseLineOpacity * 0.5 : entry.baseLineOpacity;
          entry.lineMat.color.setHex(entry.baseLineColorHex);
          if (isMuted) entry.lineMat.color.copy(entry.baseLineColorObj).multiplyScalar(0.5);
          entry.starEntries.forEach((s) => {
            s.mesh.scale.setScalar(1);
            s.mesh.material.opacity = isMuted ? 0.5 : 1.0;
            s.mesh.material.color.setHex(s.baseColorHex);
            if (isMuted) s.mesh.material.color.copy(s.baseColorObj).multiplyScalar(0.5);
            s.haloMesh.visible = false;
            s.haloMesh.material.opacity = 0;
          });
        }
      }
      this.hoveredConstellationId = null;
    }

    if (this.hoveredBodyId) {
      const b = this.dynamicBodyMap[this.hoveredBodyId];
      if (b && b.labelObj && b.labelObj.element) {
        b.labelObj.element.classList.remove('is-hovered');
      }
      this.hoveredBodyId = null;
    }

    if (this.onClearHover) {
      this.onClearHover();
    }
  }

  /**
   * 當星座被選中時：完全隱藏「東南西北」方位羅盤與地平圈、中心地球、動態行星與太陽月球、
   * 其他所有非選中星座，使畫面完全只保留選中的星座及其恆星與標籤，呈現最純淨無干擾的聚光視野。
   */
  _muteOtherStars(selectedConstellationId) {
    // 1. 深度淡化背景微弱星場
    if (this.starfieldMat) {
      this.starfieldMat.opacity = this.baseStarfieldOpacity * 0.10;
    }

    // 2. 完全隱藏「東南西北」羅盤、地平切面穹頂、方位標籤與天頂旋轉符號
    this.horizonGroup.visible = false;
    this.cardinalLabels.forEach((lbl) => {
      lbl.visible = false;
      lbl.element.style.display = 'none';
    });
    if (this.zenithRotateLabel) {
      this.zenithRotateLabel.visible = false;
      this.zenithRotateLabel.element.style.display = 'none';
    }

    // 3. 完全隱藏中心地球（含大氣層、地軸、觀測者圖釘與日照光源）
    if (this.earthGroup) {
      this.earthGroup.visible = false;
    }
    if (this.earthMesh) this.earthMesh.visible = false;
    if (this.earthAtmoMesh) this.earthAtmoMesh.visible = false;
    if (this.earthAxisLine) this.earthAxisLine.visible = false;
    if (this.observerPin) this.observerPin.visible = false;
    if (this.earthSunLight) this.earthSunLight.visible = false;

    // 4. 完全隱藏赤道圈與黃道圈幾何線條及南北天極標籤
    this.equatorGroup.visible = false;
    if (this.ncpLabel) {
      this.ncpLabel.visible = false;
      this.ncpLabel.element.style.display = 'none';
    }
    if (this.scpLabel) {
      this.scpLabel.visible = false;
      this.scpLabel.element.style.display = 'none';
    }
    this.eclipticGroup.visible = false;

    // 5. 完全隱藏背後的一切天體（太陽、月球、八大行星與冥王星及衛星）
    this.dynamicBodiesGroup.visible = false;
    Object.values(this.dynamicBodyMap).forEach((b) => {
      if (b.mesh) b.mesh.visible = false;
      if (b.haloMesh) b.haloMesh.visible = false;
      if (b.labelObj) {
        b.labelObj.visible = false;
        b.labelObj.element.style.display = 'none';
        b.labelObj.element.classList.add('muted-body-label');
      }
    });

    // 6. 其他非選中星座全部隱藏；選中星座全亮聚焦並在其背後投射古典意象圖
    Object.values(this.constellationMap).forEach((entry) => {
      if (entry.c.id !== selectedConstellationId) {
        if (entry.group) entry.group.visible = false;
        if (entry.artMesh) {
          entry.artMesh.visible = false;
          entry.artMesh.material.opacity = 0;
        }
        if (entry.labelObj) {
          entry.labelObj.visible = false;
          entry.labelObj.element.style.display = 'none';
          entry.labelObj.element.classList.add('muted-constellation-label');
        }
        entry.starEntries.forEach((s) => {
          s.mesh.visible = false;
          s.haloMesh.visible = false;
          s.detailLabel.visible = false;
          s.detailLabel.element.style.display = 'none';
        });
      } else {
        if (entry.group) entry.group.visible = true;
        // 核心：在選中星座背後顯現古典意象圖，並發出柔和星芒光輝
        if (entry.artMesh) {
          entry.artMesh.visible = true;
          entry.artMesh.material.opacity = 0.85;
        }
        if (entry.labelObj) {
          entry.labelObj.visible = true;
          entry.labelObj.element.style.display = '';
          entry.labelObj.element.classList.remove('muted-constellation-label');
        }
        entry.lineMat.opacity = 1.0;
        entry.lineMat.color.setHex(entry.baseLineColorHex);
        entry.starEntries.forEach((s) => {
          s.mesh.visible = true;
          s.mesh.scale.setScalar(1.4);
          s.mesh.material.opacity = 1.0;
          s.mesh.material.color.setHex(s.baseColorHex);
          s.haloMesh.visible = true;
          s.detailLabel.visible = true;
          s.detailLabel.element.style.display = '';
          s.detailLabel.element.classList.add('is-visible');
        });
      }
    });
  }

  /**
   * 點選星座名字（或黃道十二宮導覽鈕）：使該星群閃爍三下後維持高亮，其他星星 muted 50%，並顯現各顆星的名字與星等
   */
  selectConstellation(constellationId) {
    this.clearHighlight();
    const entry = this.constellationMap[constellationId];
    if (!entry) return;

    this._muteOtherStars(constellationId);

    this.activeHighlight = {
      type: 'Constellation',
      constellationId,
      startTime: performance.now() * 0.001
    };

    const textEl = entry.labelObj.element.querySelector('.const-label-text');
    if (textEl) {
      textEl.innerHTML = entry.expandedLabelHtml;
    } else {
      entry.labelObj.element.innerHTML = entry.expandedLabelHtml;
    }
    void entry.labelObj.element.offsetWidth;
    entry.labelObj.element.classList.add('active-blink-label');
    entry.starEntries.forEach((s) => {
      s.mesh.material.opacity = 1.0;
      s.haloMesh.visible = true;
      s.detailLabel.visible = true;
      s.detailLabel.element.style.display = '';
      s.detailLabel.element.classList.add('is-visible');
    });

    if (this.isHorizonTop) {
      this.updateHorizonClippedLabels();
    }

    if (this.onSelectObject) {
      this.onSelectObject(entry.selectInfo);
    }
  }

  /**
   * 點選單顆恆星：同時讓所屬星座閃爍三下後維持高亮、其他星星 muted 50%，並顯現各顆星名字/星等標籤
   */
  selectStar(starUserData) {
    if (!starUserData) return;
    this.clearHighlight();

    const entry = this.constellationMap[starUserData.constellationId];
    if (entry) {
      this._muteOtherStars(starUserData.constellationId);

      this.activeHighlight = {
        type: 'Constellation',
        constellationId: starUserData.constellationId,
        focusStarName: starUserData.starName,
        startTime: performance.now() * 0.001
      };
      const textEl = entry.labelObj.element.querySelector('.const-label-text');
      if (textEl) {
        textEl.innerHTML = entry.expandedLabelHtml;
      } else {
        entry.labelObj.element.innerHTML = entry.expandedLabelHtml;
      }
      void entry.labelObj.element.offsetWidth;
      entry.labelObj.element.classList.add('active-blink-label');
      entry.starEntries.forEach((s) => {
        s.mesh.material.opacity = 1.0;
        s.haloMesh.visible = true;
        s.detailLabel.visible = true;
        s.detailLabel.element.style.display = '';
        s.detailLabel.element.classList.add('is-visible');
      });
      if (this.isHorizonTop) {
        this.updateHorizonClippedLabels();
      }
    }

    if (this.onSelectObject) {
      this.onSelectObject(starUserData);
    }
  }

  /**
   * 點選行星（或太陽、月球）的名字或球體：使該星體與標籤閃爍三下後維持高亮並顯示詳細資訊
   */
  selectDynamicBody(bodyId) {
    this.clearHighlight();
    const bEntry = this.dynamicBodyMap[bodyId];
    if (!bEntry) return;

    this.activeHighlight = {
      type: 'Body',
      bodyId,
      startTime: performance.now() * 0.001
    };

    if (bEntry.labelObj && bEntry.labelObj.element) {
      const textEl = bEntry.labelObj.element.querySelector('.const-label-text');
      if (textEl && bEntry.expandedHtml) {
        textEl.innerHTML = bEntry.expandedHtml;
      } else if (bEntry.expandedHtml) {
        bEntry.labelObj.element.innerHTML = bEntry.expandedHtml;
      }
      void bEntry.labelObj.element.offsetWidth;
      bEntry.labelObj.element.classList.add('active-blink-label');
    }
    if (bEntry.haloMesh) {
      bEntry.haloMesh.visible = true;
    }

    if (this.onSelectObject && bEntry.mesh.userData) {
      this.onSelectObject(bEntry.mesh.userData);
    }
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

    // 3b. 地球四周地平羅盤環與 N S W E 方位標記 (Compass Collar & Cardinal Ticks)
    const compassGroup = new THREE.Group();

    // 羅盤半透明底環 (r = 7.3 ~ 15.2，襯托中心地球與四方刻度)
    const collarGeo = new THREE.RingGeometry(EARTH_RADIUS + 0.82, 15.2, 48);
    collarGeo.rotateX(-Math.PI / 2);
    const collarMat = new THREE.MeshBasicMaterial({
      color: 0x091426,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    compassGroup.add(new THREE.Mesh(collarGeo, collarMat));

    // 內外雙同心圓環刻度
    const innerRingPts = [];
    const outerRingPts = [];
    for (let a = 0; a <= 360; a += 4) {
      const rad = THREE.MathUtils.degToRad(a);
      innerRingPts.push(new THREE.Vector3(Math.cos(rad) * 10.6, 0, Math.sin(rad) * 10.6));
      outerRingPts.push(new THREE.Vector3(Math.cos(rad) * 14.8, 0, Math.sin(rad) * 14.8));
    }
    compassGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(innerRingPts),
        new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75 })
      )
    );
    compassGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(outerRingPts),
        new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.55 })
      )
    );

    // 四向刻度線與 45 度副刻度 (LineSegments)
    const tickPairs = [
      // 正北刻度 (-Z 方向)
      new THREE.Vector3(0, 0, -(EARTH_RADIUS + 0.82)),
      new THREE.Vector3(0, 0, -15.2),
      // 正南刻度 (+Z 方向)
      new THREE.Vector3(0, 0, EARTH_RADIUS + 0.82),
      new THREE.Vector3(0, 0, 14.8),
      // 正東刻度 (+X 方向)
      new THREE.Vector3(EARTH_RADIUS + 0.82, 0, 0),
      new THREE.Vector3(14.8, 0, 0),
      // 正西刻度 (-X 方向)
      new THREE.Vector3(-(EARTH_RADIUS + 0.82), 0, 0),
      new THREE.Vector3(-14.8, 0, 0)
    ];
    [45, 135, 225, 315].forEach((deg) => {
      const rad = THREE.MathUtils.degToRad(deg);
      tickPairs.push(
        new THREE.Vector3(Math.cos(rad) * 11.2, 0, Math.sin(rad) * 11.2),
        new THREE.Vector3(Math.cos(rad) * 14.2, 0, Math.sin(rad) * 14.2)
      );
    });
    compassGroup.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(tickPairs),
        new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.65 })
      )
    );

    // 正北方向專屬立體箭矢標記 (指向 -Z 方向，醒目翠綠)
    const northArrowPts = [
      new THREE.Vector3(-0.9, 0, -13.8),
      new THREE.Vector3(0, 0, -15.8),
      new THREE.Vector3(0.9, 0, -13.8)
    ];
    compassGroup.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(northArrowPts),
        new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.95 })
      )
    );
    this.horizonGroup.add(compassGroup);

    // 3c. 地球四周 N S W E 方位標籤 (貼近地球四周 r ≈ 14.0，俯視地平面時正北朝上)
    const rBadge = 14.0;
    const earthCardinals = [
      {
        pos: new THREE.Vector3(0, 0, -rBadge),
        html: '<span class="north-arrow">▲</span> <b>N</b> <small>北</small>',
        isNorth: true
      },
      {
        pos: new THREE.Vector3(0, 0, rBadge),
        html: '<b>S</b> <small>南</small>',
        isNorth: false
      },
      {
        pos: new THREE.Vector3(rBadge, 0, 0),
        html: '<b>E</b> <small>東</small>',
        isNorth: false
      },
      {
        pos: new THREE.Vector3(-rBadge, 0, 0),
        html: '<b>W</b> <small>西</small>',
        isNorth: false
      }
    ];
    earthCardinals.forEach((c) => {
      const cls = `celestial-label earth-cardinal-label${c.isNorth ? ' cardinal-north' : ''}`;
      const lbl = this._createLabel(c.pos, c.html, cls, this.horizonGroup);
      this.cardinalLabels.push(lbl);
    });

    // 3d. 天球外圈地平環四大方位標籤 (位於天球外邊界 r = GLOBE_RADIUS * 0.995)
    const rOuter = GLOBE_RADIUS * 0.995;
    const outerCardinals = [
      {
        pos: new THREE.Vector3(0, 0, -rOuter),
        html: '▲ <b>N</b> <small>正北 (0°)</small>',
        isNorth: true
      },
      {
        pos: new THREE.Vector3(0, 0, rOuter),
        html: '<b>S</b> <small>正南 (180°)</small>',
        isNorth: false
      },
      {
        pos: new THREE.Vector3(rOuter, 0, 0),
        html: '<b>E</b> <small>正東 (90°)</small>',
        isNorth: false
      },
      {
        pos: new THREE.Vector3(-rOuter, 0, 0),
        html: '<b>W</b> <small>正西 (270°)</small>',
        isNorth: false
      }
    ];
    outerCardinals.forEach((c) => {
      const cls = `celestial-label outer-cardinal-label${c.isNorth ? ' cardinal-north' : ''}`;
      const lbl = this._createLabel(c.pos, c.html, cls, this.horizonGroup);
      this.cardinalLabels.push(lbl);
    });

    // 天頂向量箭頭軸線 (Zenith Normal Axis，垂直於地平面切面並穿出天球外)
    const zenithOuterY = GLOBE_RADIUS * 1.07;
    const zenithPts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, zenithOuterY, 0)];
    const zenithGeo = new THREE.BufferGeometry().setFromPoints(zenithPts);
    const zenithMat = new THREE.LineDashedMaterial({
      color: 0x34d399,
      dashSize: 2,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.88
    });
    const zenithLine = new THREE.Line(zenithGeo, zenithMat);
    zenithLine.computeLineDistances();
    this.zenithLine = zenithLine;
    this.horizonGroup.add(zenithLine);

    // 穿出天球頂端至球外箭頭處的實心軸桿段 (y = GLOBE_RADIUS ~ zenithOuterY)
    const outerShaftLen = zenithOuterY - GLOBE_RADIUS;
    const outerShaftGeo = new THREE.CylinderGeometry(0.22, 0.22, outerShaftLen, 12);
    const outerShaftMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const outerShaftMesh = new THREE.Mesh(outerShaftGeo, outerShaftMat);
    outerShaftMesh.position.set(0, GLOBE_RADIUS + outerShaftLen / 2, 0);
    outerShaftMesh.userData = { isZenithRotator: true };
    this.outerShaftMesh = outerShaftMesh;
    this.pickables.push(outerShaftMesh);
    this.horizonGroup.add(outerShaftMesh);

    // 4. 天頂球外 3D 旋轉軸頂錐與黃色環形旋轉指標 (緊鄰天球外側 y = GLOBE_RADIUS * 1.07)
    const zenithCapGroup = new THREE.Group();
    zenithCapGroup.position.set(0, zenithOuterY, 0);
    this.zenithCapGroup = zenithCapGroup;

    const coneGeo = new THREE.ConeGeometry(1.4, 3.0, 18);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.position.set(0, 1.2, 0);
    coneMesh.userData = { isZenithRotator: true };
    this.pickables.push(coneMesh);
    zenithCapGroup.add(coneMesh);

    const torusGeo = new THREE.TorusGeometry(3.0, 0.3, 12, 32, Math.PI * 1.65);
    torusGeo.rotateX(Math.PI / 2);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    this.zenithRingMesh = new THREE.Mesh(torusGeo, torusMat);
    this.zenithRingMesh.userData = { isZenithRotator: true };
    this.pickables.push(this.zenithRingMesh);
    zenithCapGroup.add(this.zenithRingMesh);

    this.horizonGroup.add(zenithCapGroup);

    // 5. 天頂互動式「🔄 旋轉 90°」符號按鈕 (位於球外箭頭頂部上方 y = GLOBE_RADIUS * 1.13)
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
    this.zenithRotateLabel.position.set(0, GLOBE_RADIUS * 1.13, 0);
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
   * 重置天頂軸旋轉角度至 0°，並更新天頂按鈕角度文字
   */
  resetZenithRotation() {
    this.zenithSpinSteps = 0;
    this.targetZenithAngle = 0;
    this.currentZenithAngle = 0;
    if (this.zenithRotateBtnDiv) {
      this.zenithRotateBtnDiv.innerHTML = `<span class="rot-icon">🔄</span> 天頂軸旋轉 +90° <small id="zenith-angle-badge">(0°)</small>`;
    }
    this._applyGroupZenithOrientation();
  }

  /**
   * 將整個天球旋轉使「天頂旋轉軸 (Zenith Axis)」預設朝向世界座標 +Y (螢幕正上方)，
   * 並疊加使用者點擊天頂旋轉符號所累計的 +90° 旋轉角
   */
  _applyGroupZenithOrientation() {
    const worldUp = new THREE.Vector3(0, 1, 0);
    const spinQuat = new THREE.Quaternion().setFromAxisAngle(worldUp, this.currentZenithAngle);
    this.group.quaternion.copy(spinQuat).multiply(this.zenithToWorldUpQuat);
  }

  /**
   * 於每幀平滑插值天球繞天頂軸的 90° 旋轉動畫，並驅動選中星座或行星的閃爍高亮效果
   */
  animateZenithRotation(timeSec = performance.now() * 0.001) {
    const diff = this.targetZenithAngle - this.currentZenithAngle;
    if (Math.abs(diff) > 0.0005) {
      this.currentZenithAngle += diff * 0.14;
      if (this.zenithRingMesh) {
        this.zenithRingMesh.rotation.y += 0.12;
      }
    } else {
      this.currentZenithAngle = this.targetZenithAngle;
    }
    this._applyGroupZenithOrientation();

    // 若有選中的星座或行星，執行閃爍三下後光暈消失、星體維持高亮的動畫
    if (this.activeHighlight) {
      const elapsed = Math.max(0, timeSec - (this.activeHighlight.startTime || 0));
      const totalBlinkDuration = 1.65;
      const isBlinking = elapsed < totalBlinkDuration;

      // 星體本身亮度：經歷 3 次閃爍後維持 pulse = 1.0 恆定高亮
      const starPulse = isBlinking
        ? 0.5 - 0.5 * Math.cos((elapsed / totalBlinkDuration) * Math.PI * 5)
        : 1.0;

      // 外圍光暈 (haloMesh)：經歷完整 3 下呼吸閃爍 (0 -> 1 -> 0 共 3 週期 = 6π) 後隨之熄滅消失
      const haloPulse = isBlinking
        ? 0.5 - 0.5 * Math.cos((elapsed / totalBlinkDuration) * Math.PI * 6)
        : 0.0;

      if (this.activeHighlight.type === 'Constellation') {
        const entry = this.constellationMap[this.activeHighlight.constellationId];
        if (entry) {
          if (entry.artMesh && entry.artMesh.material) {
            entry.artMesh.visible = true;
            const targetArtOpacity = 0.82 + 0.08 * Math.sin(timeSec * 2.4);
            entry.artMesh.material.opacity = THREE.MathUtils.lerp(
              entry.artMesh.material.opacity,
              targetArtOpacity,
              0.15
            );
          }
          entry.lineMat.opacity = 0.45 + starPulse * 0.55;
          entry.lineMat.color.lerpColors(entry.baseLineColorObj, this.flashWhiteColor, starPulse * 0.7);
          entry.starEntries.forEach((s) => {
            const isFocus =
              this.activeHighlight.focusStarName && s.star.name === this.activeHighlight.focusStarName;
            const scaleAmp = isFocus ? 1.2 + starPulse * 0.45 : 1.05 + starPulse * 0.3;
            s.mesh.scale.setScalar(scaleAmp);
            s.mesh.material.color.lerpColors(s.baseColorObj, this.flashWhiteColor, starPulse * 0.85);
            if (isBlinking) {
              s.haloMesh.visible = true;
              s.haloMesh.scale.setScalar(0.85 + haloPulse * 0.75);
              s.haloMesh.material.opacity = haloPulse * 0.72;
            } else {
              s.haloMesh.visible = false;
              s.haloMesh.material.opacity = 0;
            }
          });
        }
      } else if (this.activeHighlight.type === 'Body') {
        const bEntry = this.dynamicBodyMap[this.activeHighlight.bodyId];
        if (bEntry) {
          bEntry.mesh.scale.setScalar(1.05 + starPulse * 0.35);
          bEntry.mesh.material.color.lerpColors(bEntry.baseColorObj, this.flashWhiteColor, starPulse * 0.8);
          if (bEntry.haloMesh) {
            if (isBlinking) {
              bEntry.haloMesh.visible = true;
              bEntry.haloMesh.scale.setScalar(0.85 + haloPulse * 0.8);
              bEntry.haloMesh.material.opacity = haloPulse * 0.75;
            } else {
              bEntry.haloMesh.visible = false;
              bEntry.haloMesh.material.opacity = 0;
            }
          }
        }
      }
    }

    if (this.isHorizonTop) {
      this.updateHorizonClippedLabels();
    }
  }

  _buildDynamicSkyBodies() {
    // 太陽在天球黃道上的投影
    const sunGeo = new THREE.SphereGeometry(2.6, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    const sunHalo = new THREE.Mesh(
      new THREE.SphereGeometry(2.6 * 2.2, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0, depthWrite: false })
    );
    sunHalo.visible = false;
    this.sunMesh.add(sunHalo);
    this.pickables.push(this.sunMesh);
    this.dynamicBodiesGroup.add(this.sunMesh);

    const sunLabelHtml = `
      <span class="const-label-text">☀ 太陽</span>
      <div class="const-hover-card">
        <div class="hover-title"><span>☀ 太陽</span><small>Sun</small></div>
        <div class="hover-meta">太陽系中心天體 ｜ 黃道運行樞紐</div>
        <div class="hover-desc">位於天球黃道帶上，向陽面即時照射中心地球呈現晝夜白晝面。</div>
        <div class="hover-tip">💡 點擊以檢視太陽詳細天文資訊</div>
      </div>
    `;
    this.sunLabel = this._createLabel(
      new THREE.Vector3(),
      sunLabelHtml,
      'celestial-label zodiac-label',
      this.dynamicBodiesGroup,
      () => this.selectDynamicBody('Sun'),
      () => this.hoverBody('Sun'),
      () => this.clearHover()
    );

    this.dynamicBodyMap.Sun = {
      id: 'Sun',
      mesh: this.sunMesh,
      haloMesh: sunHalo,
      labelObj: this.sunLabel,
      conciseHtml: '☀ 太陽',
      expandedHtml: '☀ 太陽 <small>Sun</small>',
      baseColorHex: 0xfacc15,
      baseColorObj: new THREE.Color(0xfacc15)
    };

    // 月球在天球上的投影
    const moonGeo = new THREE.SphereGeometry(1.9, 20, 20);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    const moonHalo = new THREE.Mesh(
      new THREE.SphereGeometry(1.9 * 2.3, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0, depthWrite: false })
    );
    moonHalo.visible = false;
    this.moonMesh.add(moonHalo);
    this.pickables.push(this.moonMesh);
    this.dynamicBodiesGroup.add(this.moonMesh);

    const moonLabelHtml = `
      <span class="const-label-text">🌙 月球</span>
      <div class="const-hover-card">
        <div class="hover-title"><span>🌙 月球</span><small>Moon</small></div>
        <div class="hover-meta">地球天然衛星 ｜ 白道運行週期</div>
        <div class="hover-desc">呈現真實相對月相與陰晴圓缺，並投影於天球視角。</div>
        <div class="hover-tip">💡 點擊以檢視月球詳細天文資訊</div>
      </div>
    `;
    this.moonLabel = this._createLabel(
      new THREE.Vector3(),
      moonLabelHtml,
      'celestial-label planet-label',
      this.dynamicBodiesGroup,
      () => this.selectDynamicBody('Moon'),
      () => this.hoverBody('Moon'),
      () => this.clearHover()
    );

    this.dynamicBodyMap.Moon = {
      id: 'Moon',
      mesh: this.moonMesh,
      haloMesh: moonHalo,
      labelObj: this.moonLabel,
      conciseHtml: '🌙 月球',
      expandedHtml: '🌙 月球 <small>Moon</small>',
      baseColorHex: 0xe2e8f0,
      baseColorObj: new THREE.Color(0xe2e8f0)
    };
  }

  _createLabel(position, htmlContent, className, parentGroup, onClick = null, onEnter = null, onLeave = null) {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = htmlContent;
    if (onClick) {
      div.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });
    }
    if (onEnter) {
      div.addEventListener('mouseenter', () => onEnter());
    }
    if (onLeave) {
      div.addEventListener('mouseleave', () => onLeave());
    }
    const label = new CSS2DObject(div);
    label.position.copy(position);
    parentGroup.add(label);
    this.labels.push(label);
    return label;
  }

  /**
   * 切換 L1 天球儀視角模式：
   * - 'zenith-up': 側面正視天球儀，天頂垂直朝上，地平圈水平橫亙中央，完整顯示全天球（包含上下兩半球）
   * - 'horizon-top': 俯視地平面（正北朝上），啟用世界座標 Y >= 0 裁切平面，只顯示地平面以上的上半球天球（地上蒼穹），地下半球與地平線以下星體標籤全部隱藏
   */
  setViewMode(viewMode) {
    this.isHorizonTop = viewMode === 'horizon-top';
    const enableClip = this.isHorizonTop;

    // 1. 3D 物件幾何裁切 (啟用世界座標 Y >= 0 裁切平面，只顯示地平面以上的上半球天球)
    this._applyClippingToMaterials(enableClip);

    // 2. 地下天球下半球網面：正北朝上俯視時完全隱藏
    if (this.lowerDomeMesh) {
      this.lowerDomeMesh.visible = !enableClip && this.horizonGroup.visible;
    }

    // 3. 天頂軸箭頭與標籤：正北朝上俯視時隱藏 (避免從天頂俯視時軸線正對相機視線阻擋中心)
    if (this.zenithCapGroup) this.zenithCapGroup.visible = !enableClip;
    if (this.outerShaftMesh) this.outerShaftMesh.visible = !enableClip;
    if (this.zenithLine) this.zenithLine.visible = !enableClip;
    if (this.zenithRotateLabel) {
      const showZenithBtn = !enableClip && this.horizonGroup.visible;
      this.zenithRotateLabel.visible = showZenithBtn;
      this.zenithRotateLabel.element.style.display = showZenithBtn ? '' : 'none';
    }

    // 4. 更新 CSS2D 標籤（隱藏位於地平面以下的星座與天體名稱）
    if (enableClip) {
      this.updateHorizonClippedLabels();
    } else {
      this._restoreAllLabelsVisibility();
    }
  }

  _applyClippingToMaterials(enableClip) {
    const planes = enableClip ? [this.horizonClipPlane] : null;
    const groupsToClip = [
      this.equatorGroup,
      this.eclipticGroup,
      this.zodiacGroup,
      this.otherConstGroup,
      this.dynamicBodiesGroup
    ];
    groupsToClip.forEach((grp) => {
      grp.traverse((child) => {
        if (child.isMesh || child.isLine || child.isPoints) {
          if (child.material) {
            child.material.clippingPlanes = planes;
            child.material.clipShadows = true;
            child.material.needsUpdate = true;
          }
        }
      });
    });
    if (this.starfieldMat) {
      this.starfieldMat.clippingPlanes = planes;
      this.starfieldMat.needsUpdate = true;
    }
    if (this.upperDomeMesh && this.upperDomeMesh.material) {
      this.upperDomeMesh.material.clippingPlanes = planes;
      this.upperDomeMesh.material.needsUpdate = true;
    }
  }

  updateHorizonClippedLabels() {
    if (!this.isHorizonTop) return;

    const isConstellationSelected = Boolean(
      this.activeHighlight && this.activeHighlight.type === 'Constellation'
    );
    const selectedId = isConstellationSelected ? this.activeHighlight.constellationId : null;

    // 1. 星座標籤 (若星座所有恆星均在地平面以下，則完全隱藏)
    Object.values(this.constellationMap).forEach((cEntry) => {
      if (isConstellationSelected && cEntry.c.id !== selectedId) {
        if (cEntry.labelObj) {
          cEntry.labelObj.visible = false;
          cEntry.labelObj.element.style.display = 'none';
        }
        return;
      }
      const centerWorldY = cEntry.c.centerDirection
        ? cEntry.c.centerDirection.clone().applyQuaternion(this.group.quaternion).y
        : 0;
      const hasVisibleStars = cEntry.starEntries.some((s) => {
        const starWorldY = s.mesh.position.clone().applyQuaternion(this.group.quaternion).y;
        return starWorldY >= -0.01;
      });
      const isVisible = centerWorldY >= -0.01 || hasVisibleStars;
      if (cEntry.labelObj) {
        const show = isVisible && this.showLabelsOption;
        cEntry.labelObj.visible = show;
        cEntry.labelObj.element.style.display = show ? '' : 'none';
      }
      // 恆星詳細標籤 (若當前處於選中星座狀態)
      cEntry.starEntries.forEach((s) => {
        if (s.detailLabel) {
          const starWorldY = s.mesh.position.clone().applyQuaternion(this.group.quaternion).y;
          const isSel = Boolean(this.activeHighlight && this.activeHighlight.constellationId === cEntry.c.id);
          const starVis = starWorldY >= -0.01 && isSel;
          s.detailLabel.visible = starVis;
          s.detailLabel.element.style.display = starVis ? '' : 'none';
          s.detailLabel.element.classList.toggle('is-visible', starVis);
        }
      });
    });

    // 當處於選中星座聚光狀態時，其他背後天體標籤皆保持隱藏
    if (isConstellationSelected) {
      if (this.sunLabel) {
        this.sunLabel.visible = false;
        this.sunLabel.element.style.display = 'none';
      }
      if (this.moonLabel) {
        this.moonLabel.visible = false;
        this.moonLabel.element.style.display = 'none';
      }
      Object.values(this.planetMeshes).forEach((pObj) => {
        if (pObj && pObj.lbl) {
          pObj.lbl.visible = false;
          pObj.lbl.element.style.display = 'none';
        }
      });
      if (this.ncpLabel) {
        this.ncpLabel.visible = false;
        this.ncpLabel.element.style.display = 'none';
      }
      if (this.scpLabel) {
        this.scpLabel.visible = false;
        this.scpLabel.element.style.display = 'none';
      }
      return;
    }

    // 2. 太陽與月球
    if (this.currentEphemeris) {
      if (this.sunLabel) {
        const sunVis = this.currentEphemeris.sun.altitude >= 0 && this.showLabelsOption;
        this.sunLabel.visible = sunVis;
        this.sunLabel.element.style.display = sunVis ? '' : 'none';
      }
      if (this.moonLabel) {
        const moonVis = this.currentEphemeris.moon.altitude >= 0 && this.showLabelsOption;
        this.moonLabel.visible = moonVis;
        this.moonLabel.element.style.display = moonVis ? '' : 'none';
      }
      // 3. 行星標籤
      this.currentEphemeris.geocentricPlanets.forEach((p) => {
        const pObj = this.planetMeshes[p.id];
        if (pObj && pObj.lbl) {
          const pVis = p.altitude >= 0 && this.showLabelsOption;
          pObj.lbl.visible = pVis;
          pObj.lbl.element.style.display = pVis ? '' : 'none';
        }
      });
    }

    // 4. 北天極與南天極標籤
    if (this.ncpLabel) {
      const ncpWorldY = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).y;
      const ncpVis = ncpWorldY >= -0.01 && this.showLabelsOption;
      this.ncpLabel.visible = ncpVis;
      this.ncpLabel.element.style.display = ncpVis ? '' : 'none';
    }
    if (this.scpLabel) {
      const scpWorldY = new THREE.Vector3(0, -1, 0).applyQuaternion(this.group.quaternion).y;
      const scpVis = scpWorldY >= -0.01 && this.showLabelsOption;
      this.scpLabel.visible = scpVis;
      this.scpLabel.element.style.display = scpVis ? '' : 'none';
    }
  }

  _restoreAllLabelsVisibility() {
    const isConstellationSelected = Boolean(
      this.activeHighlight && this.activeHighlight.type === 'Constellation'
    );
    const selectedId = isConstellationSelected ? this.activeHighlight.constellationId : null;

    const vis = this.showLabelsOption;
    Object.values(this.constellationMap).forEach((cEntry) => {
      if (isConstellationSelected && cEntry.c.id !== selectedId) {
        if (cEntry.labelObj) {
          cEntry.labelObj.visible = false;
          cEntry.labelObj.element.style.display = 'none';
        }
        return;
      }
      if (cEntry.labelObj) {
        cEntry.labelObj.visible = vis;
        cEntry.labelObj.element.style.display = vis ? '' : 'none';
      }
      cEntry.starEntries.forEach((s) => {
        if (s.detailLabel) {
          const isSelected = Boolean(this.activeHighlight && this.activeHighlight.constellationId === cEntry.c.id);
          s.detailLabel.visible = isSelected;
          s.detailLabel.element.style.display = isSelected ? '' : 'none';
          s.detailLabel.element.classList.toggle('is-visible', isSelected);
        }
      });
    });

    if (isConstellationSelected) return;

    if (this.sunLabel) {
      this.sunLabel.visible = vis;
      this.sunLabel.element.style.display = vis ? '' : 'none';
    }
    if (this.moonLabel) {
      this.moonLabel.visible = vis;
      this.moonLabel.element.style.display = vis ? '' : 'none';
    }
    Object.values(this.planetMeshes).forEach((pObj) => {
      if (pObj.lbl) {
        pObj.lbl.visible = vis;
        pObj.lbl.element.style.display = vis ? '' : 'none';
      }
    });

    if (this.ncpLabel) {
      this.ncpLabel.visible = vis;
      this.ncpLabel.element.style.display = vis ? '' : 'none';
    }
    if (this.scpLabel) {
      this.scpLabel.visible = vis;
      this.scpLabel.element.style.display = vis ? '' : 'none';
    }
  }

  setLayerVisibility(options) {
    const isConstellationSelected = Boolean(
      this.activeHighlight && this.activeHighlight.type === 'Constellation'
    );

    if (options.zodiac !== undefined) this.zodiacGroup.visible = options.zodiac;
    if (options.ecliptic !== undefined) {
      if (!isConstellationSelected) this.eclipticGroup.visible = options.ecliptic;
    }
    if (options.equator !== undefined) {
      if (!isConstellationSelected) this.equatorGroup.visible = options.equator;
    }
    if (options.otherConst !== undefined) this.otherConstGroup.visible = options.otherConst;
    if (options.horizonPlane !== undefined) {
      this.showHorizonOption = options.horizonPlane;
      if (!isConstellationSelected) {
        this.horizonGroup.visible = options.horizonPlane;
        if (this.zenithRotateLabel) {
          const showZenith = !this.isHorizonTop && options.horizonPlane;
          this.zenithRotateLabel.visible = showZenith;
          this.zenithRotateLabel.element.style.display = showZenith ? '' : 'none';
        }
        this.cardinalLabels.forEach((lbl) => {
          lbl.visible = options.horizonPlane;
          lbl.element.style.display = options.horizonPlane ? '' : 'none';
        });
        if (this.lowerDomeMesh) {
          this.lowerDomeMesh.visible = !this.isHorizonTop && options.horizonPlane;
        }
      }
    }
    if (options.labels !== undefined) {
      this.showLabelsOption = options.labels;
      if (this.isHorizonTop) {
        this.updateHorizonClippedLabels();
      } else {
        this._restoreAllLabelsVisibility();
      }
    }
  }

  update(ephemeris) {
    this.currentEphemeris = ephemeris;
    // 1. 根據格林威治恆星時 (GST) 旋轉中心地球：
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
      bodyId: 'Earth',
      title: '🌍 地球 (Earth - 天球中心)',
      subtitle: `觀測點 (${ephemeris.lat.toFixed(2)}°N, ${ephemeris.lon.toFixed(2)}°E) | 地方恆星時 ${formatRA(ephemeris.lstHours)}`,
      details: `格林威治恆星時 GST: ${formatRA(ephemeris.gstHours)}\n地球自轉姿態與日照晝夜半球完全依據目前輸入的日期時間與經緯度即時計算。`
    };

    // 2. 更新觀測者地平面切面方向 (當地天頂 Zenith 的赤經 = LST, 赤緯 = Lat)，並使天頂旋轉軸預設朝向世界座標 +Y，正北 True North 朝向 -Z
    this.zenithVec.copy(raDecToVector3(ephemeris.lstHours, ephemeris.lat, 1).normalize());
    this.zenithToWorldUpQuat.copy(getEquatorialToHorizontalQuaternion(ephemeris.lstHours, ephemeris.lat));
    this.horizonGroup.quaternion.copy(this.zenithToWorldUpQuat).invert();
    this._applyGroupZenithOrientation();

    // 2b. 根據太陽是否位於觀測者地平面以上 (sun.altitude >= 0)，動態切換地平面上下半球的天球晝夜顏色：
    // - 日出後～日落前 (sun.altitude >= 0)：上半球 (太陽所在側) 為亮天空藍，下半球為夜幕灰
    // - 日落後～日出前 (sun.altitude < 0，太陽沒入地平線以下)：上半球轉為夜幕灰，下半球 (太陽所在側) 轉為亮天空藍
    const isDayAtObserver = ephemeris.sun.altitude >= 0;
    if (this.upperDomeMesh && this.lowerDomeMesh) {
      if (isDayAtObserver) {
        this.upperDomeMesh.material.color.setHex(0x38bdf8);
        this.upperDomeMesh.material.opacity = 0.25;
        this.lowerDomeMesh.material.color.setHex(0x475569);
        this.lowerDomeMesh.material.opacity = 0.34;
      } else {
        this.upperDomeMesh.material.color.setHex(0x475569);
        this.upperDomeMesh.material.opacity = 0.34;
        this.lowerDomeMesh.material.color.setHex(0x38bdf8);
        this.lowerDomeMesh.material.opacity = 0.25;
      }
    }

    // 3. 更新太陽在天球與黃道上的位置，並同步地球日照光源方向（真實呈現地球向陽面白晝與背陽面黑夜）
    const sunPos = raDecToVector3(ephemeris.sun.ra, ephemeris.sun.dec, GLOBE_RADIUS * 0.99);
    this.sunMesh.position.copy(sunPos);
    this.sunLabel.position.copy(sunPos.clone().multiplyScalar(1.04));
    this.earthSunLight.position.copy(sunPos);
    this.sunMesh.userData = {
      type: 'Body',
      bodyId: 'Sun',
      title: '☀ 太陽 (Sun)',
      subtitle: `位於 ${ephemeris.sun.zodiac.symbol} ${ephemeris.sun.zodiac.nameZh} (${ephemeris.sun.zodiac.nameEn})`,
      details: `黃經: ${ephemeris.sun.elon.toFixed(2)}° | 赤經: ${formatRA(ephemeris.sun.ra)} | 赤緯: ${ephemeris.sun.dec.toFixed(2)}°\n當地地平仰角: ${ephemeris.sun.altitude.toFixed(1)}° | 方位角: ${ephemeris.sun.azimuth.toFixed(1)}°（按 Esc 退出高亮狀態）`
    };

    // 4. 更新月球在天球上的位置
    const moonPos = raDecToVector3(ephemeris.moon.ra, ephemeris.moon.dec, GLOBE_RADIUS * 0.96);
    this.moonMesh.position.copy(moonPos);
    this.moonLabel.position.copy(moonPos.clone().multiplyScalar(1.04));
    this.moonMesh.userData = {
      type: 'Body',
      bodyId: 'Moon',
      title: '🌙 月球 (Moon)',
      subtitle: `${ephemeris.moon.phaseName} (照明率 ${(ephemeris.moon.fraction * 100).toFixed(1)}%)`,
      details: `赤經: ${formatRA(ephemeris.moon.ra)} | 赤緯: ${ephemeris.moon.dec.toFixed(2)}°\n當地地平仰角: ${ephemeris.moon.altitude.toFixed(1)}° | 方位角: ${ephemeris.moon.azimuth.toFixed(1)}°（按 Esc 退出高亮狀態）`
    };

    // 5. 更新各大行星在天球黃道帶上的位置
    ephemeris.geocentricPlanets.forEach((p) => {
      if (!this.planetMeshes[p.id]) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.35, 16, 16),
          new THREE.MeshBasicMaterial({ color: p.color })
        );
        const haloMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.35 * 2.5, 16, 16),
          new THREE.MeshBasicMaterial({
            color: 0xfde047,
            transparent: true,
            opacity: 0,
            depthWrite: false
          })
        );
        haloMesh.visible = false;
        mesh.add(haloMesh);

        if (this.isHorizonTop) {
          mesh.material.clippingPlanes = [this.horizonClipPlane];
          mesh.material.needsUpdate = true;
          haloMesh.material.clippingPlanes = [this.horizonClipPlane];
          haloMesh.material.needsUpdate = true;
        }

        this.pickables.push(mesh);
        this.dynamicBodiesGroup.add(mesh);

        const conciseHtml = `${p.symbol} ${p.nameZh}`;
        const expandedHtml = `${p.symbol} ${p.nameZh} <small>${p.nameEn}</small>`;
        const planetLabelHtml = `
          <span class="const-label-text">${conciseHtml}</span>
          <div class="const-hover-card">
            <div class="hover-title"><span>${conciseHtml}</span><small>${p.nameEn}</small></div>
            <div class="hover-meta">太陽系行星 ｜ 距離地球 ${p.distAU.toFixed(2)} AU</div>
            <div class="hover-desc">赤經: ${formatRA(p.ra)} ｜ 赤緯: ${p.dec >= 0 ? '+' : ''}${p.dec.toFixed(1)}°</div>
            <div class="hover-tip">💡 點擊以檢視行星詳細資訊</div>
          </div>
        `;
        const lbl = this._createLabel(
          new THREE.Vector3(),
          planetLabelHtml,
          'celestial-label planet-label',
          this.dynamicBodiesGroup,
          () => this.selectDynamicBody(p.id),
          () => this.hoverBody(p.id),
          () => this.clearHover()
        );
        this.planetMeshes[p.id] = { mesh, lbl, haloMesh };
        this.dynamicBodyMap[p.id] = {
          id: p.id,
          mesh,
          haloMesh,
          labelObj: lbl,
          conciseHtml,
          expandedHtml,
          baseColorHex: p.color,
          baseColorObj: new THREE.Color(p.color)
        };
      }

      const { mesh, lbl } = this.planetMeshes[p.id];
      const pos = raDecToVector3(p.ra, p.dec, GLOBE_RADIUS * 0.985);
      mesh.position.copy(pos);
      lbl.position.copy(pos.clone().multiplyScalar(1.04));
      mesh.userData = {
        type: 'Planet',
        bodyId: p.id,
        title: `${p.symbol} ${p.nameZh} (${p.nameEn})`,
        subtitle: `距離地球 ${p.distAU.toFixed(2)} AU ｜ 當地仰角 ${p.altitude.toFixed(1)}°`,
        details: `赤經 RA: ${formatRA(p.ra)} | 赤緯 Dec: ${p.dec.toFixed(2)}°\n當地地平仰角: ${p.altitude.toFixed(1)}° | 方位角: ${p.azimuth.toFixed(1)}°（按 Esc 退出高亮狀態）`
      };
    });

    if (this.isHorizonTop) {
      this.updateHorizonClippedLabels();
    }
  }
}
