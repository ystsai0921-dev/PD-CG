import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ZODIAC_CONSTELLATIONS } from '../data/zodiacData.js';
import { createEarthTextures } from '../utils/earthTexture.js';
import { createMoonTextures } from '../utils/moonTexture.js';
import { OBLIQUITY_RAD, formatRA } from '../utils/astronomy.js';

/**
 * Level 2: 太陽系行星運動模型 (Solar System Model)
 * - 預設以太陽為中心，但可選擇任意行星或主要衛星 (月球、木衛一、木衛二、土衛六) 作為觀察視點中心
 * - 為了在同一個 3D 視窗中清晰觀察內外行星與衛星，採用非線性視覺距離映射 (Visual Orbital Radius)
 */
const PLANET_CONFIG = [
  { id: 'Sun', nameZh: '太陽', nameEn: 'Sun', symbol: '☀', radius: 5.2, visualDist: 0, color: 0xfacc15, isStar: true },
  { id: 'Mercury', nameZh: '水星', nameEn: 'Mercury', symbol: '☿', radius: 1.0, visualDist: 12, color: 0xcbd5e1 },
  { id: 'Venus', nameZh: '金星', nameEn: 'Venus', symbol: '♀', radius: 1.45, visualDist: 19, color: 0xfde047 },
  { id: 'Earth', nameZh: '地球', nameEn: 'Earth', symbol: '🌍', radius: 2.0, visualDist: 28, color: 0x3b82f6 },
  { id: 'Mars', nameZh: '火星', nameEn: 'Mars', symbol: '♂', radius: 1.25, visualDist: 38, color: 0xef4444 },
  { id: 'Jupiter', nameZh: '木星', nameEn: 'Jupiter', symbol: '♃', radius: 3.1, visualDist: 54, color: 0xfdba74 },
  { id: 'Saturn', nameZh: '土星', nameEn: 'Saturn', symbol: '♄', radius: 2.6, visualDist: 72, color: 0xfef08a, hasRing: true },
  { id: 'Uranus', nameZh: '天王星', nameEn: 'Uranus', symbol: '♅', radius: 2.0, visualDist: 90, color: 0x67e8f9 },
  { id: 'Neptune', nameZh: '海王星', nameEn: 'Neptune', symbol: '♆', radius: 1.95, visualDist: 108, color: 0x60a5fa }
];

const MOON_CONFIG = [
  { id: 'Moon', parent: 'Earth', nameZh: '月球', nameEn: 'Moon', symbol: '🌙', radius: 0.72, orbitR: 4.8, periodDays: 27.32166, color: 0xe2e8f0 },
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

    this.orbitsGroup = new THREE.Group();
    this.bodiesGroup = new THREE.Group();
    this.zodiacRingGroup = new THREE.Group();
    this.group.add(this.orbitsGroup, this.bodiesGroup, this.zodiacRingGroup);

    this.bodyMap = {};
    this.currentTargetId = 'Sun';

    this._buildSolarBodies();
    this._buildZodiacBackdropRing();
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

      // 若為地球，建立地軸傾角 (23.44°) 容器與自轉子球體，使陸地海洋自轉姿態與真實恆星時一致
      let earthTiltGroup = null;
      if (isEarth) {
        earthTiltGroup = new THREE.Group();
        // 在黃道座標系中 (+X 春分點, -Z 黃經 90° 夏至方向, +Y 黃道北極)：
        // 地球北極向 -Z (夏至時北半球傾向太陽，即 RA=18h/-90° 方向) 傾斜 23.44°，對應繞 X 軸旋轉 -OBLIQUITY_RAD
        earthTiltGroup.rotation.x = -OBLIQUITY_RAD;
        earthTiltGroup.add(mesh);
        this.bodiesGroup.add(earthTiltGroup);

        // 地球淡藍色大氣光暈與地軸線
        const atmoGeo = new THREE.SphereGeometry(cfg.radius * 1.04, 32, 24);
        const atmoMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.15,
          side: THREE.BackSide,
          depthWrite: false
        });
        mesh.add(new THREE.Mesh(atmoGeo, atmoMat));

        const axisGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, -cfg.radius * 1.65, 0),
          new THREE.Vector3(0, cfg.radius * 1.65, 0)
        ]);
        const axisMat = new THREE.LineDashedMaterial({
          color: 0x60a5fa,
          dashSize: 0.5,
          gapSize: 0.3,
          transparent: true,
          opacity: 0.65
        });
        const axisLine = new THREE.Line(axisGeo, axisMat);
        axisLine.computeLineDistances();
        earthTiltGroup.add(axisLine);

        // 觀測者地表釘選紅點
        this.earthObserverPin = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 12, 12),
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

      // 繪製行星軌道圓環
      if (cfg.visualDist > 0) {
        const pts = [];
        for (let a = 0; a <= 360; a += 2) {
          const rad = THREE.MathUtils.degToRad(a);
          pts.push(new THREE.Vector3(Math.cos(rad) * cfg.visualDist, 0, -Math.sin(rad) * cfg.visualDist));
        }
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const orbitMat = new THREE.LineBasicMaterial({
          color: cfg.id === 'Earth' ? 0x38bdf8 : 0x475569,
          transparent: true,
          opacity: cfg.id === 'Earth' ? 0.75 : 0.4
        });
        this.orbitsGroup.add(new THREE.Line(orbitGeo, orbitMat));
      }

      const label = this._createLabel(
        `${cfg.symbol} ${cfg.nameZh} <small>${cfg.nameEn}</small>`,
        cfg.isStar ? 'celestial-label zodiac-label' : 'celestial-label planet-label',
        () => {
          if (this.onSelectBody) this.onSelectBody(cfg.id, mesh.userData);
        }
      );

      this.bodyMap[cfg.id] = { cfg, mesh, earthTiltGroup, label, worldPos: new THREE.Vector3() };
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
      for (let a = 0; a <= 360; a += 6) {
        const rad = THREE.MathUtils.degToRad(a);
        pts.push(new THREE.Vector3(Math.cos(rad) * mCfg.orbitR, 0, -Math.sin(rad) * mCfg.orbitR));
      }
      const mOrbitGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const mOrbitMat = new THREE.LineBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.45
      });
      const mOrbitLine = new THREE.Line(mOrbitGeo, mOrbitMat);
      if (parentObj.earthTiltGroup) {
        // 地球的衛星軌道置於黃道水平面容器而非傾斜地軸下
        this.orbitsGroup.add(mOrbitLine);
        this.earthMoonOrbitLine = mOrbitLine;
      } else {
        parentObj.mesh.add(mOrbitLine);
      }

      const label = this._createLabel(
        `${mCfg.symbol} ${mCfg.nameZh} <small>${mCfg.nameEn}</small>`,
        'celestial-label',
        () => {
          if (this.onSelectBody) this.onSelectBody(mCfg.id, mesh.userData);
        }
      );

      this.bodyMap[mCfg.id] = { cfg: mCfg, mesh, label, isMoon: true, worldPos: new THREE.Vector3() };
    });
  }

  _buildZodiacBackdropRing() {
    // 外圍遠處的黃道十二宮參考環，方便理解從太陽系或地球看出去的十二宮背景方向
    const R = 145;
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
      const lbl = new CSS2DObject(div);
      lbl.position.copy(pos);
      this.zodiacRingGroup.add(lbl);
      this.labels.push(lbl);
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
    if (options.orbits !== undefined) this.orbitsGroup.visible = options.orbits;
    if (options.zodiacBackdrop !== undefined) this.zodiacRingGroup.visible = options.zodiacBackdrop;
  }

  getTargetPosition(targetId) {
    const item = this.bodyMap[targetId] || this.bodyMap.Sun;
    return item.worldPos.clone();
  }

  update(ephemeris) {
    const helio = ephemeris.helioPositions;

    // 1. 更新太陽與八大行星位置
    PLANET_CONFIG.forEach((cfg) => {
      const entry = this.bodyMap[cfg.id];
      if (cfg.id === 'Sun') {
        entry.mesh.position.set(0, 0, 0);
        entry.worldPos.set(0, 0, 0);
        entry.label.position.set(0, cfg.radius + 2.2, 0);
        entry.mesh.userData = {
          type: 'SolarBody',
          bodyId: 'Sun',
          title: '☀ 太陽 (Sun)',
          subtitle: '太陽系重力中心 (Heliocentric Center)',
          details: '預設太陽系觀察視點。點擊左側選單或畫面中任意行星/衛星即可切換相機視點中心。'
        };
        return;
      }

      const h = helio[cfg.id];
      if (!h) return;

      const lam = THREE.MathUtils.degToRad(h.elon);
      const bet = THREE.MathUtils.degToRad(h.elat);
      const r = cfg.visualDist;

      const x = r * Math.cos(bet) * Math.cos(lam);
      const y = r * Math.sin(bet) * 2.0; // 微幅放大黃緯傾角以便觀察軌道立體感
      const z = -r * Math.cos(bet) * Math.sin(lam);

      if (entry.earthTiltGroup) {
        entry.earthTiltGroup.position.set(x, y, z);
        entry.mesh.position.set(0, 0, 0);
        // 根據格林威治恆星時 (GST) 旋轉地球，並更新觀測者紅點座標
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
        if (this.earthMoonOrbitLine) {
          this.earthMoonOrbitLine.position.set(x, y, z);
        }
      } else {
        entry.mesh.position.set(x, y, z);
      }

      entry.worldPos.set(x, y, z);
      entry.label.position.set(x, y + cfg.radius + 1.8, z);

      entry.mesh.userData = {
        type: 'SolarBody',
        bodyId: cfg.id,
        title: `${cfg.symbol} ${cfg.nameZh} (${cfg.nameEn})`,
        subtitle: `日心距離: ${h.rAU.toFixed(3)} AU`,
        details: cfg.id === 'Earth'
          ? `日心黃經: ${h.elon.toFixed(2)}° | 地軸傾角: 23.44° | 恆星時 GST: ${formatRA(ephemeris.gstHours)}\n表面呈現真實海洋陸地、晝夜受光與觀測點位置。`
          : `日心黃經: ${h.elon.toFixed(2)}° | 日心黃緯: ${h.elat.toFixed(2)}°\n點擊可將相機視點鎖定於 ${cfg.nameZh}。`
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
      entry.label.position.set(px, py + mCfg.radius + 1.2, pz);

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
        details: mCfg.id === 'Moon'
          ? `月相：${ephemeris.moon.phaseName} (照明率 ${(ephemeris.moon.fraction * 100).toFixed(1)}%)\n表面呈現真實月海與環形山凹凸陰影，且月球正面永遠潮汐鎖定朝向地球。`
          : `目前做為 ${parentEntry.cfg.nameZh} 的天然衛星運轉中。可設為太陽系視角觀察中心。`
      };
    });
  }
}
