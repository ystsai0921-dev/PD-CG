import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ZODIAC_CONSTELLATIONS } from '../data/zodiacData.js';
import { createEarthTextures } from '../utils/earthTexture.js';
import { createMoonTextures } from '../utils/moonTexture.js';
import { OBLIQUITY_RAD, OBLIQUITY_DEG, formatRA } from '../utils/astronomy.js';

/**
 * Level 2: 太陽系行星運動模型 (Solar System Model)
 * - 預設以太陽為中心（位於各行星橢圓軌道的其中一個「焦點 Focus」），可選擇任意行星或主要衛星作為視點中心
 * - 完整呈現八大行星的 3D 克卜勒橢圓軌道（含近日點黃經 periLon、軌道離心率、黃道傾角 incl 與升交點 ascNode）
 * - 特別強化地球橢圓軌道：標示「近日點 Perihelion (0.983 AU，約1月4日)」、「遠日點 Aphelion (1.017 AU，約7月4日)」與長軸連線
 * - 清晰呈現地球自轉軸（相對於黃道面法線傾斜 23.44°，指向北天極北極星方向）、赤道環、黃道法線與傾角圓弧
 */
const PLANET_CONFIG = [
  {
    id: 'Sun',
    nameZh: '太陽',
    nameEn: 'Sun',
    symbol: '☀',
    radius: 5.0,
    visualDist: 0,
    color: 0xfacc15,
    isStar: true
  },
  {
    id: 'Mercury',
    nameZh: '水星',
    nameEn: 'Mercury',
    symbol: '☿',
    radius: 1.0,
    visualDist: 12.5,
    realA: 0.387,
    realEcc: 0.2056,
    visEcc: 0.22,
    periLon: 77.46,
    incl: 7.0,
    ascNode: 48.33,
    color: 0xcbd5e1,
    orbitColor: 0x94a3b8
  },
  {
    id: 'Venus',
    nameZh: '金星',
    nameEn: 'Venus',
    symbol: '♀',
    radius: 1.45,
    visualDist: 19.5,
    realA: 0.723,
    realEcc: 0.0068,
    visEcc: 0.035,
    periLon: 131.53,
    incl: 3.39,
    ascNode: 76.68,
    color: 0xfde047,
    orbitColor: 0xeab308
  },
  {
    id: 'Earth',
    nameZh: '地球',
    nameEn: 'Earth',
    symbol: '🌍',
    radius: 2.15,
    visualDist: 30.0,
    realA: 1.0,
    realEcc: 0.0167,
    // 適度放大視覺離心率 (0.16) 以便在 3D 視窗中一眼看出地球橢圓軌道、太陽焦點偏移與近日/遠日點差異
    visEcc: 0.16,
    periLon: 102.95, // 地球近日點日心黃經 ≈ 102.95° (每年1月3~4日左右)
    incl: 0.0,
    ascNode: 0.0,
    color: 0x3b82f6,
    orbitColor: 0x38bdf8
  },
  {
    id: 'Mars',
    nameZh: '火星',
    nameEn: 'Mars',
    symbol: '♂',
    radius: 1.3,
    visualDist: 43.0,
    realA: 1.524,
    realEcc: 0.0934,
    visEcc: 0.13,
    periLon: 336.04,
    incl: 1.85,
    ascNode: 49.56,
    color: 0xef4444,
    orbitColor: 0xf87171
  },
  {
    id: 'Jupiter',
    nameZh: '木星',
    nameEn: 'Jupiter',
    symbol: '♃',
    radius: 3.1,
    visualDist: 58.0,
    realA: 5.203,
    realEcc: 0.0489,
    visEcc: 0.075,
    periLon: 14.75,
    incl: 1.31,
    ascNode: 100.46,
    color: 0xfdba74,
    orbitColor: 0xfb923c
  },
  {
    id: 'Saturn',
    nameZh: '土星',
    nameEn: 'Saturn',
    symbol: '♄',
    radius: 2.6,
    visualDist: 75.0,
    realA: 9.537,
    realEcc: 0.0565,
    visEcc: 0.075,
    periLon: 92.43,
    incl: 2.49,
    ascNode: 113.66,
    color: 0xfef08a,
    orbitColor: 0xfacc15,
    hasRing: true
  },
  {
    id: 'Uranus',
    nameZh: '天王星',
    nameEn: 'Uranus',
    symbol: '♅',
    radius: 2.0,
    visualDist: 92.0,
    realA: 19.191,
    realEcc: 0.0472,
    visEcc: 0.065,
    periLon: 170.96,
    incl: 0.77,
    ascNode: 74.01,
    color: 0x67e8f9,
    orbitColor: 0x22d3ee
  },
  {
    id: 'Neptune',
    nameZh: '海王星',
    nameEn: 'Neptune',
    symbol: '♆',
    radius: 1.95,
    visualDist: 109.0,
    realA: 30.069,
    realEcc: 0.0086,
    visEcc: 0.03,
    periLon: 44.97,
    incl: 1.77,
    ascNode: 131.78,
    color: 0x60a5fa,
    orbitColor: 0x60a5fa
  }
];

const MOON_CONFIG = [
  { id: 'Moon', parent: 'Earth', nameZh: '月球', nameEn: 'Moon', symbol: '🌙', radius: 0.72, orbitR: 5.4, periodDays: 27.32166, color: 0xe2e8f0 },
  { id: 'Io', parent: 'Jupiter', nameZh: '木衛一（伊奧）', nameEn: 'Io', symbol: 'Io', radius: 0.48, orbitR: 5.2, periodDays: 1.769, color: 0xfef08a },
  { id: 'Europa', parent: 'Jupiter', nameZh: '木衛二（歐羅巴）', nameEn: 'Europa', symbol: 'Eu', radius: 0.45, orbitR: 7.0, periodDays: 3.551, color: 0xbae6fd },
  { id: 'Titan', parent: 'Saturn', nameZh: '土衛六（泰坦）', nameEn: 'Titan', symbol: 'Ti', radius: 0.58, orbitR: 6.8, periodDays: 15.945, color: 0xfdba74 }
];

export class SolarSystemModel {
  constructor(onSelectBody) {
    this.group = new THREE.Group();
    this.onSelectBody = onSelectBody;
    this.pickables = [];
    this.labels = [];
    this.orbitLabels = [];
    this.zodiacBackdropLabels = [];
    this.isActiveScale = false;

    this.orbitsGroup = new THREE.Group();
    this.bodiesGroup = new THREE.Group();
    this.zodiacRingGroup = new THREE.Group();
    this.zodiacRingGroup.visible = false; // 預設取消勾選「顯示遠處黃道十二宮背景」
    this.group.add(this.orbitsGroup, this.bodiesGroup, this.zodiacRingGroup);

    this.bodyMap = {};
    this.currentTargetId = 'Sun';

    this._buildSolarBodies();
    this._buildZodiacBackdropRing();
  }

  /**
   * 根據行星軌道根數計算給定日心黃經 lonDeg (度) 在 3D 橢圓軌道上的座標點
   * 太陽位於原點 (0, 0, 0) 即橢圓的其中一個焦點 (Focus)：
   * 極座標橢圓方程式：r(λ) = a * (1 - e^2) / (1 + e * cos(λ - ϖ))
   * - 當 λ = ϖ (近日點黃經 periLon) 時，r 最小 = a * (1 - e)
   * - 當 λ = ϖ + 180° (遠日點黃經) 時，r 最大 = a * (1 + e)
   */
  _computeEllipticalOrbitPoint(cfg, lonDeg) {
    const a = cfg.visualDist;
    const e = cfg.visEcc || 0;
    const periRad = THREE.MathUtils.degToRad(cfg.periLon || 0);
    const lam = THREE.MathUtils.degToRad(lonDeg);
    const inclRad = THREE.MathUtils.degToRad(cfg.incl || 0);
    const nodeRad = THREE.MathUtils.degToRad(cfg.ascNode || 0);

    // 焦點極座標半徑 r(λ)
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(lam - periRad));

    // 軌道傾角造成的黃緯高度 (微幅放大 1.8 倍讓各行星軌道立體交角更易分辨)
    const latRad = inclRad * Math.sin(lam - nodeRad);
    const y = r * Math.sin(latRad) * 1.8;
    const rProj = r * Math.cos(latRad);

    const x = rProj * Math.cos(lam);
    const z = -rProj * Math.sin(lam);

    return new THREE.Vector3(x, y, z);
  }

  _buildSolarBodies() {
    // 太陽中心點光源 (照亮所有行星與月球的向陽面與地形凹凸陰影)
    const sunLight = new THREE.PointLight(0xfffbeb, 3.2, 600, 0.12);
    this.group.add(sunLight);

    const earthTex = createEarthTextures();
    const moonTex = createMoonTextures();

    PLANET_CONFIG.forEach((cfg) => {
      const isEarth = cfg.id === 'Earth';
      const geo = new THREE.SphereGeometry(cfg.radius, isEarth ? 64 : 28, isEarth ? 48 : 24);

      let mat;
      if (cfg.isStar) {
        mat = new THREE.MeshBasicMaterial({ color: cfg.color });
      } else if (isEarth) {
        // L2 地球：真實呈現藍色海洋、各大洲陸地與地形凹凸貼圖
        mat = new THREE.MeshStandardMaterial({
          map: earthTex.colorMap,
          bumpMap: earthTex.bumpMap,
          bumpScale: 0.14,
          roughness: 0.55,
          metalness: 0.08,
          emissive: 0x0b1d3a,
          emissiveMap: earthTex.colorMap,
          emissiveIntensity: 0.25
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: cfg.color,
          roughness: 0.6,
          metalness: 0.1,
          emissive: cfg.color,
          emissiveIntensity: 0.18
        });
      }

      const mesh = new THREE.Mesh(geo, mat);

      // 若為地球，建立：
      // 1. earthSystemGroup：隨地球公轉移動（不傾斜，用於放置黃道垂直法線與 23.44° 傾角弧）
      // 2. earthTiltGroup：相對於黃道面法線傾斜 23.44° (繞 X 軸旋轉 -OBLIQUITY_RAD)，包含地球自轉軸與地球本體
      let earthSystemGroup = null;
      let earthTiltGroup = null;
      if (isEarth) {
        earthSystemGroup = new THREE.Group();
        earthTiltGroup = new THREE.Group();
        // 在黃道座標系中 (+X 春分點, -Z 黃經 90° 方向, +Y 黃道北極)：
        // 地球北極向 -Z (夏至時北半球傾向太陽，冬至時背向太陽) 傾斜 23.44°
        earthTiltGroup.rotation.x = -OBLIQUITY_RAD;
        earthTiltGroup.add(mesh);
        earthSystemGroup.add(earthTiltGroup);
        this.bodiesGroup.add(earthSystemGroup);

        // 地球淡藍色大氣光暈
        const atmoGeo = new THREE.SphereGeometry(cfg.radius * 1.04, 32, 24);
        const atmoMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.15,
          side: THREE.BackSide,
          depthWrite: false
        });
        mesh.add(new THREE.Mesh(atmoGeo, atmoMat));

        // 強化版地球自轉軸（包含實心亮桿、北極指向箭頭錐、南極端點、赤道環、黃道法線與 23.44° 傾角標示）
        this._buildEarthRotationAxisVisuals(cfg.radius, earthSystemGroup, earthTiltGroup);

        // 觀測者地表釘選紅點
        this.earthObserverPin = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0xf43f5e })
        );
        mesh.add(this.earthObserverPin);
      } else {
        this.bodiesGroup.add(mesh);
      }

      this.pickables.push(mesh);

      if (cfg.hasRing) {
        const ringGeo = new THREE.RingGeometry(cfg.radius * 1.4, cfg.radius * 2.3, 48);
        ringGeo.rotateX(Math.PI / 2.2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xfde68a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65
        });
        mesh.add(new THREE.Mesh(ringGeo, ringMat));
      }

      // 繪製各行星清晰的 3D 橢圓軌道與近日點/遠日點標記
      if (cfg.visualDist > 0) {
        this._buildPlanetEllipticalOrbit(cfg);
      }

      const label = this._createLabel(
        `${cfg.symbol} ${cfg.nameZh} <small>${cfg.nameEn}</small>`,
        cfg.isStar
          ? 'celestial-label zodiac-label solar-body-label'
          : 'celestial-label planet-label solar-body-label',
        () => {
          if (this.onSelectBody) this.onSelectBody(cfg.id, mesh.userData);
        }
      );

      this.bodyMap[cfg.id] = {
        cfg,
        mesh,
        earthSystemGroup,
        earthTiltGroup,
        label,
        worldPos: new THREE.Vector3()
      };
    });

    // 建立主要衛星 (月球、木衛、土衛)
    MOON_CONFIG.forEach((mCfg) => {
      const isLunar = mCfg.id === 'Moon';
      const geo = new THREE.SphereGeometry(mCfg.radius, isLunar ? 48 : 18, isLunar ? 48 : 18);
      const mat = isLunar
        ? new THREE.MeshStandardMaterial({
            map: moonTex.colorMap,
            bumpMap: moonTex.bumpMap,
            bumpScale: 0.16,
            roughness: 0.88,
            metalness: 0.02,
            emissive: 0x1e293b,
            emissiveMap: moonTex.colorMap,
            emissiveIntensity: 0.14
          })
        : new THREE.MeshStandardMaterial({
            color: mCfg.color,
            roughness: 0.7,
            emissive: mCfg.color,
            emissiveIntensity: 0.2
          });

      const mesh = new THREE.Mesh(geo, mat);
      this.bodiesGroup.add(mesh);
      this.pickables.push(mesh);

      // 衛星繞母行星的小軌道環
      const parentObj = this.bodyMap[mCfg.parent];
      const pts = [];
      for (let a = 0; a <= 360; a += 4) {
        const rad = THREE.MathUtils.degToRad(a);
        pts.push(new THREE.Vector3(Math.cos(rad) * mCfg.orbitR, 0, -Math.sin(rad) * mCfg.orbitR));
      }
      const mOrbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const mOrbitMat = new THREE.LineBasicMaterial({
        color: isLunar ? 0xcbd5e1 : 0x94a3b8,
        transparent: true,
        opacity: isLunar ? 0.65 : 0.45
      });
      const mOrbitLine = new THREE.Line(mOrbitGeo, mOrbitMat);
      if (parentObj.earthSystemGroup) {
        parentObj.earthSystemGroup.add(mOrbitLine);
      } else {
        parentObj.mesh.add(mOrbitLine);
      }

      const label = this._createLabel(
        `${mCfg.symbol} ${mCfg.nameZh} <small>${mCfg.nameEn}</small>`,
        'celestial-label satellite-label solar-body-label',
        () => {
          if (this.onSelectBody) this.onSelectBody(mCfg.id, mesh.userData);
        }
      );

      this.bodyMap[mCfg.id] = { cfg: mCfg, mesh, label, isMoon: true, worldPos: new THREE.Vector3() };
    });
  }

  /**
   * 建立地球自轉軸、北極箭頭、赤道環、黃道法線與 23.44° 黃赤交角視覺化
   */
  _buildEarthRotationAxisVisuals(earthR, earthSystemGroup, earthTiltGroup) {
    const axisHalfLen = earthR * 2.55;

    // 1. 貫穿地球南北極的實心發光自轉軸桿 (置於 earthTiltGroup 內，隨 23.44° 傾斜)
    const shaftGeo = new THREE.CylinderGeometry(0.085, 0.085, axisHalfLen * 2, 16);
    const shaftMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const shaftMesh = new THREE.Mesh(shaftGeo, shaftMat);
    shaftMesh.userData = {
      type: 'EarthAxis',
      title: '🧭 地球自轉軸 (Earth Rotation Axis)',
      subtitle: `地軸傾角 (黃赤交角) = ${OBLIQUITY_DEG.toFixed(2)}°`,
      details:
        '地球自轉軸相對於黃道面法線傾斜 23.44°，北極端恆指向北天極（小熊座北極星 Polaris 附近）。\n正因為地軸傾斜且在公轉過程中保持指向不變，才產生了地球四季更迭與晝夜長短變化。'
    };
    this.pickables.push(shaftMesh);
    earthTiltGroup.add(shaftMesh);

    // 2. 北極端金色箭頭錐 (North Pole Arrowhead)
    const northConeGeo = new THREE.ConeGeometry(0.32, 0.85, 18);
    const northConeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const northCone = new THREE.Mesh(northConeGeo, northConeMat);
    northCone.position.set(0, axisHalfLen + 0.35, 0);
    northCone.userData = shaftMesh.userData;
    this.pickables.push(northCone);
    earthTiltGroup.add(northCone);

    // 3. 南極端標記球 (South Pole Cap)
    const southCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa })
    );
    southCap.position.set(0, -axisHalfLen, 0);
    earthTiltGroup.add(southCap);

    // 4. 北極軸周圍的「由西向東（北極俯視逆時針）」自轉方向立體圓弧與方向箭頭
    const rotR = earthR * 0.62;
    const rotY = earthR * 1.68;
    const startDeg = 15;
    const endDeg = 300;
    const rotCurvePts = [];
    for (let deg = startDeg; deg <= endDeg; deg += 5) {
      const rad = THREE.MathUtils.degToRad(deg);
      // 繞 +Y 軸正向自轉（由西向東）：由 +X 轉向 -Z，即 (cos(θ), y, -sin(θ))
      rotCurvePts.push(new THREE.Vector3(Math.cos(rad) * rotR, rotY, -Math.sin(rad) * rotR));
    }
    const rotCurve = new THREE.CatmullRomCurve3(rotCurvePts);
    const rotTubeGeo = new THREE.TubeGeometry(rotCurve, 48, 0.065, 12, false);
    const rotTubeMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const rotTubeMesh = new THREE.Mesh(rotTubeGeo, rotTubeMat);
    rotTubeMesh.userData = shaftMesh.userData;
    this.pickables.push(rotTubeMesh);
    earthTiltGroup.add(rotTubeMesh);

    // 北極自轉圓弧前端的 3D 方向箭頭錐 (指向切線方向: (-sin(θ), 0, -cos(θ)))
    const endRad = THREE.MathUtils.degToRad(endDeg);
    const tipPos = new THREE.Vector3(Math.cos(endRad) * rotR, rotY, -Math.sin(endRad) * rotR);
    const tangentDir = new THREE.Vector3(-Math.sin(endRad), 0, -Math.cos(endRad)).normalize();
    const rotArrowGeo = new THREE.ConeGeometry(0.24, 0.62, 16);
    const rotArrowMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const rotArrowCone = new THREE.Mesh(rotArrowGeo, rotArrowMat);
    rotArrowCone.position.copy(tipPos).addScaledVector(tangentDir, 0.18);
    rotArrowCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangentDir);
    rotArrowCone.userData = shaftMesh.userData;
    this.pickables.push(rotArrowCone);
    earthTiltGroup.add(rotArrowCone);

    // 5. 地球傾斜赤道環與 4 個由西向東自轉方向箭頭 (Tilted Equatorial Ring + Rotation Arrows)
    const eqR = earthR * 1.26;
    const eqRingPts = [];
    for (let deg = 0; deg <= 360; deg += 3) {
      const rad = THREE.MathUtils.degToRad(deg);
      eqRingPts.push(new THREE.Vector3(Math.cos(rad) * eqR, 0, -Math.sin(rad) * eqR));
    }
    const eqRingLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(eqRingPts),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    earthTiltGroup.add(eqRingLine);

    // 在赤道環四個象限配置鮮明的由西向東自轉方向箭頭錐
    const eqArrowGeo = new THREE.ConeGeometry(0.22, 0.58, 16);
    const eqArrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    [45, 135, 225, 315].forEach((deg) => {
      const rad = THREE.MathUtils.degToRad(deg);
      const pos = new THREE.Vector3(Math.cos(rad) * eqR, 0, -Math.sin(rad) * eqR);
      const tan = new THREE.Vector3(-Math.sin(rad), 0, -Math.cos(rad)).normalize();
      const arrow = new THREE.Mesh(eqArrowGeo, eqArrowMat);
      arrow.position.copy(pos);
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      arrow.userData = shaftMesh.userData;
      this.pickables.push(arrow);
      earthTiltGroup.add(arrow);
    });

    // 6. 黃道面垂直法線參考虛線 (置於不傾斜的 earthSystemGroup，方便與傾斜地軸對照 23.44° 夾角)
    const eclNormalPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, axisHalfLen + 0.4, 0)
    ];
    const eclNormalGeo = new THREE.BufferGeometry().setFromPoints(eclNormalPts);
    const eclNormalMat = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      dashSize: 0.35,
      gapSize: 0.25,
      transparent: true,
      opacity: 0.7
    });
    const eclNormalLine = new THREE.Line(eclNormalGeo, eclNormalMat);
    eclNormalLine.computeLineDistances();
    earthSystemGroup.add(eclNormalLine);

    // 7. 黃道法線與地軸之間的 23.44° 傾角圓弧 (Obliquity Arc in YZ plane)
    const arcPts = [];
    const arcR = earthR * 1.95;
    for (let step = 0; step <= 24; step++) {
      const ang = (step / 24) * OBLIQUITY_RAD;
      arcPts.push(new THREE.Vector3(0, Math.cos(ang) * arcR, -Math.sin(ang) * arcR));
    }
    const arcLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(arcPts),
      new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 })
    );
    earthSystemGroup.add(arcLine);

    // 8. 地球自轉軸與自轉方向 3D 標籤 (綁定於北極箭頭尖端上方)
    const axisDiv = document.createElement('div');
    axisDiv.className = 'celestial-label zodiac-label solar-body-label';
    axisDiv.innerHTML = `🧭 地軸北極 N ↺ <small>傾角 23.44° ｜ 由西向東自轉</small>`;
    axisDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onSelectBody) this.onSelectBody(null, shaftMesh.userData);
    });
    const axisLabel = new CSS2DObject(axisDiv);
    axisLabel.position.set(0, axisHalfLen + 1.25, 0);
    earthTiltGroup.add(axisLabel);
    this.labels.push(axisLabel);
  }

  /**
   * 繪製單一行星的 3D 克卜勒橢圓軌道，並特別標出地球軌道的近日點、遠日點與長軸線
   */
  _buildPlanetEllipticalOrbit(cfg) {
    const isEarth = cfg.id === 'Earth';
    const pts = [];
    for (let deg = 0; deg <= 360; deg += 1) {
      pts.push(this._computeEllipticalOrbitPoint(cfg, deg));
    }

    const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const orbitMat = new THREE.LineBasicMaterial({
      color: cfg.orbitColor,
      transparent: true,
      opacity: isEarth ? 0.98 : 0.68
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    this.orbitsGroup.add(orbitLine);

    if (isEarth) {
      // 為地球橢圓軌道加上半透明光暈軌道帶 (Ribbon)，讓橢圓形狀更加醒目清晰
      const ribbonPositions = [];
      const innerScale = 0.982;
      const outerScale = 1.018;
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        ribbonPositions.push(
          p1.x * innerScale, p1.y, p1.z * innerScale,
          p1.x * outerScale, p1.y, p1.z * outerScale,
          p2.x * outerScale, p2.y, p2.z * outerScale,
          p1.x * innerScale, p1.y, p1.z * innerScale,
          p2.x * outerScale, p2.y, p2.z * outerScale,
          p2.x * innerScale, p2.y, p2.z * innerScale
        );
      }
      const ribbonGeo = new THREE.BufferGeometry();
      ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
      const ribbonMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      this.orbitsGroup.add(new THREE.Mesh(ribbonGeo, ribbonMat));

      // 計算地球近日點 (Perihelion, λ = 102.95°) 與遠日點 (Aphelion, λ = 282.95°) 座標
      const periPos = this._computeEllipticalOrbitPoint(cfg, cfg.periLon);
      const aphPos = this._computeEllipticalOrbitPoint(cfg, cfg.periLon + 180);

      // 1. 橢圓長軸連線 (Line of Apsides：連接近日點 ↔ 太陽焦點 ↔ 橢圓幾何中心 ↔ 遠日點)
      const apsidesGeo = new THREE.BufferGeometry().setFromPoints([periPos, aphPos]);
      const apsidesMat = new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 1.2,
        gapSize: 0.9,
        transparent: true,
        opacity: 0.6
      });
      const apsidesLine = new THREE.Line(apsidesGeo, apsidesMat);
      apsidesLine.computeLineDistances();
      this.orbitsGroup.add(apsidesLine);

      // 標示橢圓幾何中心 (與位於焦點的太陽偏移 c = a * e)
      const centerPos = periPos.clone().add(aphPos).multiplyScalar(0.5);
      const centerDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x94a3b8 })
      );
      centerDot.position.copy(centerPos);
      this.orbitsGroup.add(centerDot);

      // 2. 地球近日點 (Perihelion) 標記球與標籤
      const periInfo = {
        type: 'OrbitPoint',
        title: '🔥 地球近日點 (Earth Perihelion)',
        subtitle: '日心距離約 0.9833 AU (約 1 億 4710 萬公里) ｜ 每年 1 月 3～4 日前後',
        details:
          '地球在橢圓軌道上距離太陽最近的位置（日心黃經約 102.95°，此時從地球看太陽位於黃經約 282.95° 射手座）。\n依克卜勒第二定律（等面積定律），地球通過近日點時的公轉角速度最快（約 30.29 km/s）；此時北半球正值隆冬。'
      };
      const periMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.78, 18, 18),
        new THREE.MeshBasicMaterial({ color: 0xf97316 })
      );
      periMesh.position.copy(periPos);
      periMesh.userData = periInfo;
      this.pickables.push(periMesh);
      this.orbitsGroup.add(periMesh);

      const periDiv = document.createElement('div');
      periDiv.className = 'celestial-label zodiac-label solar-body-label';
      periDiv.innerHTML = '🔥 近日點 Perihelion <small>0.983 AU (約1/4)</small>';
      periDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onSelectBody) this.onSelectBody(null, periInfo);
      });
      const periLabel = new CSS2DObject(periDiv);
      const periDir = periPos.clone().normalize();
      periLabel.position.copy(periPos.clone().addScaledVector(periDir, 2.5).add(new THREE.Vector3(0, 0.8, 0)));
      this.orbitsGroup.add(periLabel);
      this.labels.push(periLabel);
      this.orbitLabels.push(periLabel);

      // 3. 地球遠日點 (Aphelion) 標記球與標籤
      const aphInfo = {
        type: 'OrbitPoint',
        title: '❄️ 地球遠日點 (Earth Aphelion)',
        subtitle: '日心距離約 1.0167 AU (約 1 億 5210 萬公里) ｜ 每年 7 月 4～5 日前後',
        details:
          '地球在橢圓軌道上距離太陽最遠的位置（日心黃經約 282.95°，此時從地球看太陽位於黃經約 102.95° 雙子/巨蟹座交界）。\n依克卜勒第二定律，地球通過遠日點時的公轉速度最慢（約 29.29 km/s）；此時北半球地軸傾向太陽，正值盛夏。'
      };
      const aphMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.78, 18, 18),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      aphMesh.position.copy(aphPos);
      aphMesh.userData = aphInfo;
      this.pickables.push(aphMesh);
      this.orbitsGroup.add(aphMesh);

      const aphDiv = document.createElement('div');
      aphDiv.className = 'celestial-label planet-label solar-body-label';
      aphDiv.innerHTML = '❄️ 遠日點 Aphelion <small>1.017 AU (約7/4)</small>';
      aphDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onSelectBody) this.onSelectBody(null, aphInfo);
      });
      const aphLabel = new CSS2DObject(aphDiv);
      const aphDir = aphPos.clone().normalize();
      aphLabel.position.copy(aphPos.clone().addScaledVector(aphDir, 2.5).add(new THREE.Vector3(0, 0.8, 0)));
      this.orbitsGroup.add(aphLabel);
      this.labels.push(aphLabel);
      this.orbitLabels.push(aphLabel);
    } else if (cfg.visEcc >= 0.1) {
      // 水星與火星等高離心率行星也在其近日點標示小光點
      const pPos = this._computeEllipticalOrbitPoint(cfg, cfg.periLon);
      const pDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 12, 12),
        new THREE.MeshBasicMaterial({ color: cfg.orbitColor })
      );
      pDot.position.copy(pPos);
      pDot.userData = {
        type: 'OrbitPoint',
        title: `${cfg.symbol} ${cfg.nameZh}近日點 (${cfg.nameEn} Perihelion)`,
        subtitle: `近日點日心黃經 ${cfg.periLon}° | 真實軌道離心率 e = ${cfg.realEcc}`,
        details: `${cfg.nameZh}橢圓軌道上距離太陽最近的頂點。`
      };
      this.pickables.push(pDot);
      this.orbitsGroup.add(pDot);
    }
  }

  _buildZodiacBackdropRing() {
    // 外圍遠處的黃道十二宮參考環，方便理解從太陽系或地球看出去的十二宮背景方向
    const R = 148;
    const pts = [];
    for (let deg = 0; deg <= 360; deg += 1) {
      const rad = THREE.MathUtils.degToRad(deg);
      pts.push(new THREE.Vector3(Math.cos(rad) * R, 0, -Math.sin(rad) * R));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 3,
      gapSize: 2,
      transparent: true,
      opacity: 0.5
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    this.zodiacRingGroup.add(line);

    ZODIAC_CONSTELLATIONS.forEach((sign) => {
      const midDeg = sign.eclipticStart + 15;
      const rad = THREE.MathUtils.degToRad(midDeg);
      const pos = new THREE.Vector3(Math.cos(rad) * R, 0, -Math.sin(rad) * R);

      const div = document.createElement('div');
      div.className = 'celestial-label zodiac-label';
      div.innerHTML = `${sign.symbol} ${sign.nameZh} <small>${sign.nameEn}</small>`;
      div.style.display = 'none'; // 預設隱藏
      const lbl = new CSS2DObject(div);
      lbl.position.copy(pos);
      this.zodiacRingGroup.add(lbl);
      this.labels.push(lbl);
      this.zodiacBackdropLabels.push(lbl);
    });
  }

  _createLabel(html, className, onClick) {
    const div = document.createElement('div');
    div.className = className;
    div.innerHTML = html;
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    const lbl = new CSS2DObject(div);
    this.bodiesGroup.add(lbl);
    this.labels.push(lbl);
    return lbl;
  }

  setOptions(options) {
    if (options.orbits !== undefined) {
      this.orbitsGroup.visible = options.orbits;
    }
    if (options.zodiacBackdrop !== undefined) {
      this.zodiacRingGroup.visible = options.zodiacBackdrop;
    }
    this.syncLabelsVisibility(this.isActiveScale);
  }

  syncLabelsVisibility(isSolarActive) {
    this.isActiveScale = isSolarActive;
    this.labels.forEach((lbl) => {
      if (!isSolarActive) {
        lbl.element.style.display = 'none';
        return;
      }
      if (this.zodiacBackdropLabels.includes(lbl)) {
        lbl.element.style.display = this.zodiacRingGroup.visible ? '' : 'none';
      } else if (this.orbitLabels.includes(lbl)) {
        lbl.element.style.display = this.orbitsGroup.visible ? '' : 'none';
      } else {
        lbl.element.style.display = '';
      }
    });
  }

  getTargetPosition(targetId) {
    const item = this.bodyMap[targetId] || this.bodyMap.Sun;
    return item.worldPos.clone();
  }

  update(ephemeris) {
    const helio = ephemeris.helioPositions;

    // 1. 更新太陽與八大行星在各自 3D 橢圓軌道上的位置
    PLANET_CONFIG.forEach((cfg) => {
      const entry = this.bodyMap[cfg.id];
      if (cfg.id === 'Sun') {
        entry.mesh.position.set(0, 0, 0);
        entry.worldPos.set(0, 0, 0);
        // 太陽標籤放置於球體周圍 (-Z 方向上方與微幅 +Y)，在俯視黃道面與傾角下均不擋住太陽球體
        entry.label.position.set(0, cfg.radius + 1.2, -(cfg.radius + 3.8));
        entry.mesh.userData = {
          type: 'SolarBody',
          bodyId: 'Sun',
          title: '☀ 太陽 (Sun — 橢圓軌道焦點 Focus)',
          subtitle: '太陽系重力中心 (Heliocentric Focus)',
          details:
            '依克卜勒第一定律，八大行星皆以橢圓軌道繞太陽公轉，且太陽位於橢圓的其中一個「焦點」上，因此產生了各行星的近日點與遠日點。'
        };
        return;
      }

      const h = helio[cfg.id];
      if (!h) return;

      // 依據該行星當時的真實日心黃經 h.elon，直接對應至其 3D 克卜勒橢圓軌道座標
      const orbitPos = this._computeEllipticalOrbitPoint(cfg, h.elon);
      const { x, y, z } = orbitPos;

      if (entry.earthSystemGroup) {
        entry.earthSystemGroup.position.set(x, y, z);
        entry.mesh.position.set(0, 0, 0);
        // 根據格林威治恆星時 (GST) 繞傾斜 23.44° 的地軸自轉，並更新觀測者紅點座標
        entry.mesh.rotation.y = THREE.MathUtils.degToRad(ephemeris.gstHours * 15);
        if (this.earthObserverPin) {
          const latRad = THREE.MathUtils.degToRad(ephemeris.lat);
          const lonRad = THREE.MathUtils.degToRad(ephemeris.lon);
          const rPin = cfg.radius + 0.05;
          this.earthObserverPin.position.set(
            rPin * Math.cos(latRad) * Math.cos(lonRad),
            rPin * Math.sin(latRad),
            -rPin * Math.cos(latRad) * Math.sin(lonRad)
          );
        }
      } else {
        entry.mesh.position.set(x, y, z);
      }

      entry.worldPos.set(x, y, z);
      // 行星標籤標示在球體周圍 (-Z 方向上方與微幅 +Y)，在俯視黃道面與任意視角下均不擋住球體與土星光環
      const visualRadius = cfg.hasRing ? 5.2 : cfg.radius;
      const zOffset = -(visualRadius + 3.0);
      const yOffset = cfg.radius + 1.2;
      entry.label.position.set(x, y + yOffset, z + zOffset);

      entry.mesh.userData = {
        type: 'SolarBody',
        bodyId: cfg.id,
        title: `${cfg.symbol} ${cfg.nameZh} (${cfg.nameEn})`,
        subtitle: `目前日心距離: ${h.rAU.toFixed(4)} AU | 軌道離心率 e = ${cfg.realEcc}`,
        details:
          cfg.id === 'Earth'
            ? `日心黃經: ${h.elon.toFixed(2)}° | 地軸傾角: 23.44° | 恆星時 GST: ${formatRA(ephemeris.gstHours)}\n近日點: 0.9833 AU (約1/4) | 遠日點: 1.0167 AU (約7/4)。`
            : `日心黃經: ${h.elon.toFixed(2)}° | 近日點黃經: ${cfg.periLon}° | 黃道傾角: ${cfg.incl}°\n點擊可將相機視點鎖定於 ${cfg.nameZh}。`
      };
    });

    // 2. 更新衛星繞行位置與月球潮汐鎖定正面朝向地球
    const daysSinceJ2000 = (ephemeris.date.getTime() - Date.UTC(2000, 0, 1, 12, 0, 0)) / 86400000;
    MOON_CONFIG.forEach((mCfg) => {
      const entry = this.bodyMap[mCfg.id];
      const parentEntry = this.bodyMap[mCfg.parent];
      if (!parentEntry) return;

      let angleRad;
      if (mCfg.id === 'Moon') {
        // 月球使用真實地心黃經方向 (太陽黃經 + 月相角)
        const moonElon = ephemeris.sun.elon + ephemeris.moon.phaseDeg;
        angleRad = THREE.MathUtils.degToRad(moonElon);
      } else {
        angleRad = ((daysSinceJ2000 / mCfg.periodDays) * Math.PI * 2) % (Math.PI * 2);
      }

      const px = parentEntry.worldPos.x + Math.cos(angleRad) * mCfg.orbitR;
      const py = parentEntry.worldPos.y;
      const pz = parentEntry.worldPos.z - Math.sin(angleRad) * mCfg.orbitR;

      entry.mesh.position.set(px, py, pz);
      entry.worldPos.set(px, py, pz);

      // 衛星標籤標示於衛星外側周圍（朝遠離母行星方向延伸），避免遮擋衛星本體與母行星
      const mDx = px - parentEntry.worldPos.x;
      const mDz = pz - parentEntry.worldPos.z;
      const mDist = Math.sqrt(mDx * mDx + mDz * mDz) || 1;
      const mUx = mDx / mDist;
      const mUz = mDz / mDist;
      const mOffset = mCfg.radius + 1.6;
      entry.label.position.set(px + mUx * mOffset, py + mCfg.radius + 0.8, pz + mUz * mOffset);

      // 若為月球，將月球正面 (+Z 軸：風暴洋、雨海、澄海、靜海、危海) 永遠潮汐鎖定朝向地球中心
      if (mCfg.id === 'Moon') {
        entry.mesh.up.set(0, 1, 0);
        entry.mesh.lookAt(parentEntry.worldPos);
      }

      entry.mesh.userData = {
        type: 'SolarBody',
        bodyId: mCfg.id,
        title: `${mCfg.symbol} ${mCfg.nameZh} (${mCfg.nameEn})`,
        subtitle: `所屬行星：${parentEntry.cfg.nameZh} | 公轉週期 ${mCfg.periodDays} 天`,
        details:
          mCfg.id === 'Moon'
            ? `月相：${ephemeris.moon.phaseName} (照明率 ${(ephemeris.moon.fraction * 100).toFixed(1)}%)\n表面呈現真實月海與環形山凹凸陰影，且月球正面永遠潮汐鎖定朝向地球。`
            : `目前做為 ${parentEntry.cfg.nameZh} 的天然衛星運轉中。可設為太陽系視角觀察中心。`
      };
    });
  }
}
