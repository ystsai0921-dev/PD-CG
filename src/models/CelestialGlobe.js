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
    this.constellationMap = {};
    this.dynamicBodyMap = {};
    this.starDetailLabels = [];
    this.activeHighlight = null;
    this.flashWhiteColor = new THREE.Color(0xffffff);
    this.flashGoldColor = new THREE.Color(0xfde047);

    this.zenithVec = new THREE.Vector3(0, 1, 0);
    this.zenithToWorldUpQuat = new THREE.Quaternion();
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

      // 將各恆星標籤往星群外圍微幅扇形推開，避免相鄰恆星名字標籤重疊
      const outward = new THREE.Vector3().subVectors(starPos, centerSpherePos);
      if (outward.lengthSq() > 0.01) {
        outward.normalize().multiplyScalar(1.6);
      }
      sEntry.detailLabel.position.copy(starPos.clone().multiplyScalar(1.015).add(outward));
    });

    // 預設天球距離約 228，適度 Zoom-in 距離介於 145 ~ 168（視星群跨距自動調整）
    const zoomDistance = Math.round(Math.max(145, Math.min(168, GLOBE_RADIUS + 38 + maxSpread * 1.35)));

    const conciseLabelHtml = isZodiac ? `${c.symbol} ${c.nameZh}` : `${c.nameZh}`;
    const expandedLabelHtml = isZodiac
      ? `${c.symbol} ${c.nameZh} <small>${c.nameEn}</small>`
      : `${c.nameZh} <small>${c.nameEn}</small>`;

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
      conciseLabelHtml,
      isZodiac ? 'celestial-label zodiac-label' : 'celestial-label',
      cGroup,
      () => {
        this.selectConstellation(c.id);
      }
    );
    c.centerDirection = centerDir.clone();
    c.zoomDistance = zoomDistance;
    c.labelObject = labelObj;

    this.constellationMap[c.id] = {
      c,
      isZodiac,
      starEntries,
      lineMat,
      baseLineColorHex,
      baseLineColorObj: new THREE.Color(baseLineColorHex),
      baseLineOpacity,
      labelObj,
      conciseLabelHtml,
      expandedLabelHtml,
      selectInfo: constSelectInfo
    };

    targetGroup.add(cGroup);
  }

  /**
   * 清除目前天球上所有星座或行星的閃爍高亮狀態、恢復所有星星 100% 原始亮度，並隱藏各別恆星標籤 (例如按 Esc 退出時呼叫)
   */
  clearHighlight() {
    if (this.starfieldMat) {
      this.starfieldMat.opacity = this.baseStarfieldOpacity;
    }

    Object.values(this.constellationMap).forEach((entry) => {
      entry.labelObj.element.classList.remove('active-blink-label', 'muted-constellation-label');
      entry.labelObj.element.innerHTML = entry.conciseLabelHtml;
      entry.lineMat.color.setHex(entry.baseLineColorHex);
      entry.lineMat.opacity = entry.baseLineOpacity;
      entry.starEntries.forEach((s) => {
        s.mesh.scale.setScalar(1);
        s.mesh.material.color.setHex(s.baseColorHex);
        s.mesh.material.opacity = 1.0;
        s.haloMesh.visible = false;
        s.haloMesh.material.opacity = 0;
        s.detailLabel.visible = false;
        s.detailLabel.element.style.display = 'none';
      });
    });

    Object.values(this.dynamicBodyMap).forEach((b) => {
      if (b.labelObj && b.labelObj.element) {
        b.labelObj.element.classList.remove('active-blink-label');
        if (b.conciseHtml) b.labelObj.element.innerHTML = b.conciseHtml;
      }
      b.mesh.scale.setScalar(1);
      b.mesh.material.color.setHex(b.baseColorHex);
      if (b.haloMesh) {
        b.haloMesh.visible = false;
        b.haloMesh.material.opacity = 0;
      }
    });

    this.activeHighlight = null;
  }

  /**
   * 將非當前選中星座的其他所有恆星、星座連線與背景星場 Muted 50%，藉此強烈凸顯所選星座
   */
  _muteOtherStars(selectedConstellationId) {
    if (this.starfieldMat) {
      this.starfieldMat.opacity = this.baseStarfieldOpacity * 0.5;
    }

    Object.values(this.constellationMap).forEach((entry) => {
      if (entry.c.id !== selectedConstellationId) {
        entry.labelObj.element.classList.add('muted-constellation-label');
        entry.lineMat.opacity = entry.baseLineOpacity * 0.5;
        entry.lineMat.color.copy(entry.baseLineColorObj).multiplyScalar(0.5);
        entry.starEntries.forEach((s) => {
          s.mesh.material.opacity = 0.5;
          s.mesh.material.color.copy(s.baseColorObj).multiplyScalar(0.5);
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

    entry.labelObj.element.innerHTML = entry.expandedLabelHtml;
    void entry.labelObj.element.offsetWidth;
    entry.labelObj.element.classList.add('active-blink-label');
    entry.starEntries.forEach((s) => {
      s.mesh.material.opacity = 1.0;
      s.haloMesh.visible = true;
      s.detailLabel.visible = true;
      s.detailLabel.element.style.display = '';
    });

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
      entry.labelObj.element.innerHTML = entry.expandedLabelHtml;
      void entry.labelObj.element.offsetWidth;
      entry.labelObj.element.classList.add('active-blink-label');
      entry.starEntries.forEach((s) => {
        s.mesh.material.opacity = 1.0;
        s.haloMesh.visible = true;
        s.detailLabel.visible = true;
        s.detailLabel.element.style.display = '';
      });
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
      if (bEntry.expandedHtml) bEntry.labelObj.element.innerHTML = bEntry.expandedHtml;
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

    // 天頂向量箭頭軸線 (Zenith Normal Axis，垂直於地平面切面並穿出天球外)
    const zenithOuterY = GLOBE_RADIUS * 1.15;
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
    this.horizonGroup.add(zenithLine);

    // 穿出天球頂端至球外箭頭處的實心軸桿段 (y = GLOBE_RADIUS ~ zenithOuterY)
    const outerShaftLen = zenithOuterY - GLOBE_RADIUS;
    const outerShaftGeo = new THREE.CylinderGeometry(0.22, 0.22, outerShaftLen, 12);
    const outerShaftMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const outerShaftMesh = new THREE.Mesh(outerShaftGeo, outerShaftMat);
    outerShaftMesh.position.set(0, GLOBE_RADIUS + outerShaftLen / 2, 0);
    outerShaftMesh.userData = { isZenithRotator: true };
    this.pickables.push(outerShaftMesh);
    this.horizonGroup.add(outerShaftMesh);

    // 4. 天頂球外 3D 旋轉軸頂錐與黃色環形旋轉指標 (移至天球外側 y = GLOBE_RADIUS * 1.15)
    const zenithCapGroup = new THREE.Group();
    zenithCapGroup.position.set(0, zenithOuterY, 0);

    const coneGeo = new THREE.ConeGeometry(1.6, 3.8, 18);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.position.set(0, 1.5, 0);
    coneMesh.userData = { isZenithRotator: true };
    this.pickables.push(coneMesh);
    zenithCapGroup.add(coneMesh);

    const torusGeo = new THREE.TorusGeometry(3.6, 0.36, 12, 32, Math.PI * 1.65);
    torusGeo.rotateX(Math.PI / 2);
    const torusMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    this.zenithRingMesh = new THREE.Mesh(torusGeo, torusMat);
    this.zenithRingMesh.userData = { isZenithRotator: true };
    this.pickables.push(this.zenithRingMesh);
    zenithCapGroup.add(this.zenithRingMesh);

    this.horizonGroup.add(zenithCapGroup);

    // 5. 天頂互動式「🔄 旋轉 90°」符號按鈕 (位於球外箭頭更外側 y = GLOBE_RADIUS * 1.23)
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
    this.zenithRotateLabel.position.set(0, GLOBE_RADIUS * 1.23, 0);
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

    this.sunLabel = this._createLabel(
      new THREE.Vector3(),
      '☀ 太陽',
      'celestial-label zodiac-label',
      this.dynamicBodiesGroup,
      () => this.selectDynamicBody('Sun')
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

    this.moonLabel = this._createLabel(
      new THREE.Vector3(),
      '🌙 月球',
      'celestial-label planet-label',
      this.dynamicBodiesGroup,
      () => this.selectDynamicBody('Moon')
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
        this.zenithRotateLabel.visible = options.horizonPlane;
        this.zenithRotateLabel.element.style.display = options.horizonPlane ? '' : 'none';
      }
    }
    if (options.labels !== undefined) {
      this.labels.forEach((lbl) => {
        if (lbl === this.zenithRotateLabel) {
          lbl.visible = this.horizonGroup.visible;
          lbl.element.style.display = this.horizonGroup.visible ? '' : 'none';
        } else {
          lbl.visible = options.labels;
          lbl.element.style.display = options.labels ? '' : 'none';
        }
      });
    }
  }

  update(ephemeris) {
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
      title: '🌍 地球 (Earth - 天球中心)',
      subtitle: `觀測點 (${ephemeris.lat.toFixed(2)}°N, ${ephemeris.lon.toFixed(2)}°E) | 地方恆星時 ${formatRA(ephemeris.lstHours)}`,
      details: `格林威治恆星時 GST: ${formatRA(ephemeris.gstHours)}\n地球自轉姿態與日照晝夜半球完全依據目前輸入的日期時間與經緯度即時計算。`
    };

    // 2. 更新觀測者地平面切面方向 (當地天頂 Zenith 的赤經 = LST, 赤緯 = Lat)，並使天頂旋轉軸預設朝向螢幕正上方 (+Y)
    this.zenithVec.copy(raDecToVector3(ephemeris.lstHours, ephemeris.lat, 1).normalize());
    const upDefault = new THREE.Vector3(0, 1, 0);
    this.horizonGroup.quaternion.setFromUnitVectors(upDefault, this.zenithVec);
    this.zenithToWorldUpQuat.setFromUnitVectors(this.zenithVec, upDefault);
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

        this.pickables.push(mesh);
        this.dynamicBodiesGroup.add(mesh);

        const conciseHtml = `${p.symbol} ${p.nameZh}`;
        const expandedHtml = `${p.symbol} ${p.nameZh} <small>${p.nameEn}</small>`;
        const lbl = this._createLabel(
          new THREE.Vector3(),
          conciseHtml,
          'celestial-label planet-label',
          this.dynamicBodiesGroup,
          () => this.selectDynamicBody(p.id)
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
  }
}
