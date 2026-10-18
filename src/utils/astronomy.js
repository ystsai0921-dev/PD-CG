import * as THREE from 'three';
import * as Astronomy from 'astronomy-engine';
import { ZODIAC_CONSTELLATIONS } from '../data/zodiacData.js';

export const OBLIQUITY_DEG = 23.43928;
export const OBLIQUITY_RAD = THREE.MathUtils.degToRad(OBLIQUITY_DEG);

/**
 * 將赤道座標 (RA 小時 0~24, Dec 度 -90~90) 轉換為 Three.js 三維直角座標
 * 約定：
 * +Y 為北天極 (Dec = +90°)
 * +X 為春分點方向 (RA = 0h, Dec = 0°)
 * -Z 為 RA = 6h, Dec = 0° (右手赤道座標系映射到 Three.js)
 */
export function raDecToVector3(raHours, decDeg, radius = 100) {
  const raRad = THREE.MathUtils.degToRad(raHours * 15);
  const decRad = THREE.MathUtils.degToRad(decDeg);

  const x = radius * Math.cos(decRad) * Math.cos(raRad);
  const y = radius * Math.sin(decRad);
  const z = -radius * Math.cos(decRad) * Math.sin(raRad);

  return new THREE.Vector3(x, y, z);
}

/**
 * 將黃道座標 (黃經 lambdaDeg, 黃緯 betaDeg) 轉換為天球赤道座標系下的 Three.js 向量
 */
export function eclipticToVector3(lambdaDeg, betaDeg = 0, radius = 100) {
  const lam = THREE.MathUtils.degToRad(lambdaDeg);
  const bet = THREE.MathUtils.degToRad(betaDeg);
  const eps = OBLIQUITY_RAD;

  // 標準黃道轉赤道直角座標 (x: 春分點, y_eq: RA=6h, z_eq: 北天極)
  const xEq = Math.cos(bet) * Math.cos(lam);
  const yEq = Math.cos(bet) * Math.sin(lam) * Math.cos(eps) - Math.sin(bet) * Math.sin(eps);
  const zEq = Math.cos(bet) * Math.sin(lam) * Math.sin(eps) + Math.sin(bet) * Math.cos(eps);

  return new THREE.Vector3(xEq * radius, zEq * radius, -yEq * radius);
}

/**
 * 將地平座標 (方位角 Azimuth: 北=0, 東=90, 南=180, 西=270; 仰角 Altitude: -90~+90)
 * 轉換為地平模型 Three.js 向量 (+Y 天頂, -Z 北, +X 東, +Z 南, -X 西)
 */
export function altAzToHorizonVector3(altDeg, azDeg, radius = 80) {
  const alt = THREE.MathUtils.degToRad(altDeg);
  const az = THREE.MathUtils.degToRad(azDeg);

  const y = radius * Math.sin(alt);
  const horiz = radius * Math.cos(alt);
  const x = horiz * Math.sin(az);
  const z = -horiz * Math.cos(az);

  return new THREE.Vector3(x, y, z);
}

/**
 * 根據黃經度數 (0~360) 取得所屬黃道十二宮資訊
 */
export function getZodiacFromLongitude(lonDeg) {
  const norm = ((lonDeg % 360) + 360) % 360;
  const idx = Math.floor(norm / 30) % 12;
  const degInSign = norm - idx * 30;
  const sign = ZODIAC_CONSTELLATIONS[idx];
  return {
    ...sign,
    longitude: norm,
    degInSign
  };
}

/**
 * 計算給定時間與觀測者經緯度的完整天文曆表資訊
 */
export function computeEphemeris(date, lat, lon) {
  const astroTime = Astronomy.MakeTime(date);
  const observer = new Astronomy.Observer(lat, lon, 0);

  // 1. 太陽赤道座標、黃道座標、地平座標
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, astroTime, observer, true, true);
  const sunHor = Astronomy.Horizon(astroTime, observer, sunEq.ra, sunEq.dec, 'normal');
  const sunGeoVec = Astronomy.GeoVector(Astronomy.Body.Sun, astroTime, true);
  const sunEcl = Astronomy.Ecliptic(sunGeoVec);

  // 2. 月球赤道座標、地平座標、月相
  const moonEq = Astronomy.Equator(Astronomy.Body.Moon, astroTime, observer, true, true);
  const moonHor = Astronomy.Horizon(astroTime, observer, moonEq.ra, moonEq.dec, 'normal');
  const moonPhaseDeg = Astronomy.MoonPhase(astroTime);
  const moonIllum = Astronomy.Illumination(Astronomy.Body.Moon, astroTime);

  // 3. 地方恆星時 (Local Sidereal Time)
  const gstHours = Astronomy.SiderealTime(astroTime);
  const lstHours = ((gstHours + lon / 15) % 24 + 24) % 24;

  // 4. 各大行星地心赤道座標 (供天球儀標示行星於黃道上的位置)
  const planetList = [
    { id: 'Mercury', nameZh: '水星', nameEn: 'Mercury', symbol: '☿', color: 0xcbd5e1 },
    { id: 'Venus', nameZh: '金星', nameEn: 'Venus', symbol: '♀', color: 0xfde047 },
    { id: 'Mars', nameZh: '火星', nameEn: 'Mars', symbol: '♂', color: 0xf87171 },
    { id: 'Jupiter', nameZh: '木星', nameEn: 'Jupiter', symbol: '♃', color: 0xfdba74 },
    { id: 'Saturn', nameZh: '土星', nameEn: 'Saturn', symbol: '♄', color: 0xfef08a },
    { id: 'Uranus', nameZh: '天王星', nameEn: 'Uranus', symbol: '♅', color: 0x67e8f9 },
    { id: 'Neptune', nameZh: '海王星', nameEn: 'Neptune', symbol: '♆', color: 0x60a5fa }
  ];

  const geocentricPlanets = planetList.map((p) => {
    const eq = Astronomy.Equator(Astronomy.Body[p.id], astroTime, observer, true, true);
    const hor = Astronomy.Horizon(astroTime, observer, eq.ra, eq.dec, 'normal');
    return {
      ...p,
      ra: eq.ra,
      dec: eq.dec,
      distAU: eq.dist,
      altitude: hor.altitude,
      azimuth: hor.azimuth
    };
  });

  // 5. 日心座標 (Heliocentric) 供 Level 2 太陽系行星運動模型使用
  const helioBodies = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  const helioPositions = {};
  for (const bodyName of helioBodies) {
    const vec = Astronomy.HelioVector(Astronomy.Body[bodyName], astroTime);
    // 將 J2000 赤道日心向量轉為黃道面為水平面的 Three.js 座標
    const ecl = Astronomy.Ecliptic(vec);
    const rAU = vec.Length();
    const lam = THREE.MathUtils.degToRad(ecl.elon);
    const bet = THREE.MathUtils.degToRad(ecl.elat);
    helioPositions[bodyName] = {
      elon: ecl.elon,
      elat: ecl.elat,
      rAU,
      // 單位 AU (1 AU)
      x: rAU * Math.cos(bet) * Math.cos(lam),
      y: rAU * Math.sin(bet),
      z: -rAU * Math.cos(bet) * Math.sin(lam)
    };
  }

  return {
    date,
    lat,
    lon,
    gstHours,
    lstHours,
    sun: {
      ra: sunEq.ra,
      dec: sunEq.dec,
      elon: sunEcl.elon,
      elat: sunEcl.elat,
      altitude: sunHor.altitude,
      azimuth: sunHor.azimuth,
      zodiac: getZodiacFromLongitude(sunEcl.elon)
    },
    moon: {
      ra: moonEq.ra,
      dec: moonEq.dec,
      altitude: moonHor.altitude,
      azimuth: moonHor.azimuth,
      phaseDeg: moonPhaseDeg,
      phaseName: getMoonPhaseName(moonPhaseDeg),
      fraction: moonIllum.phase_fraction
    },
    geocentricPlanets,
    helioPositions
  };
}

export function getMoonPhaseName(phaseDeg) {
  const d = ((phaseDeg % 360) + 360) % 360;
  if (d < 22.5 || d >= 337.5) return '新月（朔 New Moon）';
  if (d < 67.5) return '眉月（Waxing Crescent）';
  if (d < 112.5) return '上弦月（First Quarter）';
  if (d < 157.5) return '盈凸月（Waxing Gibbous）';
  if (d < 202.5) return '滿月（望 Full Moon）';
  if (d < 247.5) return '虧凸月（Waning Gibbous）';
  if (d < 292.5) return '下弦月（Last Quarter）';
  return '殘月（Waning Crescent）';
}

export function formatRA(raHours) {
  const h = Math.floor(raHours);
  const mFloat = (raHours - h) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}
