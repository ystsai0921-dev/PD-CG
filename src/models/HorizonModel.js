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

  _buildGnomonAndShadow() {
    // 中央觀測者與立竿 (Gnomon：高 6 單位，用於觀察日影方向與長度)
    const poleH = 6;
    const poleGeo = new THREE.CylinderGeometry(0.25, 0.35, poleH, 16);
    poleGeo.translate(0, poleH / 2, 0);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    this.gnomonPole = new THREE.Mesh(poleGeo, poleMat);
    this.gnomonGroup.add(this.gnomonPole);

    // 地面日影線
    const shadowGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.12, 0),
      new THREE.Vector3(0, 0.12, 0)
    ]);
    const shadowMat = new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3 });
    this.shadowLine = new THREE.Line(shadowGeo, shadowMat);
    this.gnomonGroup.add(this.shadowLine);

    // 日影端點圓點
    this.shadowTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    this.gnomonGroup.add(this.shadowTip);
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

    // 2. 立竿日影計算 (僅當太陽高於地平面 2° 以上時投射地面日影)
    if (ephemeris.sun.altitude > 2) {
      const poleH = 6;
      const altRad = THREE.MathUtils.degToRad(ephemeris.sun.altitude);
      const shadowLen = Math.min(DOME_RADIUS * 0.9, poleH / Math.tan(altRad));
      // 影子方向與太陽方位相反 (+180°)
      const oppAzRad = THREE.MathUtils.degToRad(ephemeris.sun.azimuth + 180);
      const sx = shadowLen * Math.sin(oppAzRad);
      const sz = -shadowLen * Math.cos(oppAzRad);

      this.shadowLine.visible = true;
      this.shadowTip.visible = true;
      this.shadowLine.geometry.setFromPoints([
        new THREE.Vector3(0, 0.12, 0),
        new THREE.Vector3(sx, 0.12, sz)
      ]);
      this.shadowTip.position.set(sx, 0.2, sz);
    } else {
      this.shadowLine.visible = false;
      this.shadowTip.visible = false;
    }

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
}
