import * as Astronomy from 'astronomy-engine';
import { ZODIAC_CONSTELLATIONS, OTHER_CONSTELLATIONS } from '../data/zodiacData.js';
import { formatRA } from '../utils/astronomy.js';

/**
 * SkyScreenView (L1 天幕投影模式)
 * 將觀測者面向指定方位（東 E=90°、南 S=180°、西 W=270°、北 N=0°）的天空，
 * 以平面天幕呈現：
 * - 下由地平線起 (仰角 Altitude = 0°)
 * - 上至頭頂天頂 (仰角 Altitude = 90°)
 * - 左右橫跨 180° (中心方位角 ± 90°)
 */
const DIRECTION_CONFIG = {
  N: { centerAz: 0, nameZh: '北方天幕', nameEn: 'North Sky', leftLabel: '西 W (270°)', centerLabel: '北 N (0°)', rightLabel: '東 E (90°)' },
  E: { centerAz: 90, nameZh: '東方天幕', nameEn: 'East Sky', leftLabel: '北 N (0°)', centerLabel: '東 E (90°)', rightLabel: '南 S (180°)' },
  S: { centerAz: 180, nameZh: '南方天幕', nameEn: 'South Sky', leftLabel: '東 E (90°)', centerLabel: '南 S (180°)', rightLabel: '西 W (270°)' },
  W: { centerAz: 270, nameZh: '西方天幕', nameEn: 'West Sky', leftLabel: '南 S (180°)', centerLabel: '西 W (270°)', rightLabel: '北 N (0°)' }
};

export class SkyScreenView {
  constructor(canvas, onSelectObject) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelectObject = onSelectObject;

    this.active = false;
    this.direction = 'S'; // 'E' | 'S' | 'W' | 'N'
    this.ephemeris = null;
    this.interactiveTargets = [];

    // 產生固定種子的背景微光星群 (RA 0~24h, Dec -90~90)
    this.bgStars = [];
    let seed = 420192;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    for (let i = 0; i < 900; i++) {
      const ra = rand() * 24;
      const dec = (Math.acos(2 * rand() - 1) * 180) / Math.PI - 90;
      const size = 0.6 + rand() * 1.1;
      const alpha = 0.25 + rand() * 0.55;
      this.bgStars.push({ ra, dec, size, alpha });
    }

    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('resize', () => {
      if (this.active) this.render();
    });

    this.canvas.addEventListener('click', (e) => {
      if (!this.active) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const item of this.interactiveTargets) {
        const dx = mx - item.x;
        const dy = my - item.y;
        if (dx * dx + dy * dy <= item.hitRadius * item.hitRadius) {
          if (this.onSelectObject) {
            this.onSelectObject(item.info);
          }
          break;
        }
      }
    });
  }

  setDirection(dir) {
    if (DIRECTION_CONFIG[dir]) {
      this.direction = dir;
      if (this.active) this.render();
    }
  }

  setActive(flag) {
    this.active = flag;
    if (this.active) {
      this.render();
    }
  }

  update(ephemeris) {
    this.ephemeris = ephemeris;
    if (this.active) {
      this.render();
    }
  }

  /**
   * 將赤道座標 (raHours, decDeg) 透過觀測者當前時間與經緯度轉為地平座標 (az, alt)
   */
  _raDecToAltAz(raHours, decDeg, astroTime, observer) {
    const hor = Astronomy.Horizon(astroTime, observer, raHours, decDeg, 'normal');
    return { az: hor.azimuth, alt: hor.altitude };
  }

  /**
   * 將方位角差值正規化至 [-180°, +180°]
   */
  _deltaAz(az, centerAz) {
    let d = ((az - centerAz + 540) % 360) - 180;
    return d;
  }

  render() {
    if (!this.active || !this.ephemeris) return;

    const parent = this.canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (this.canvas.width !== width * dpr || this.canvas.height !== height * dpr) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);

    // 定義平面天幕繪圖框邊距 (留出上下左右座標刻度與頂部返回列空間)
    const padLeft = 64;
    const padRight = 48;
    const padTop = 66;
    const padBottom = 64;

    const plotW = Math.max(200, width - padLeft - padRight);
    const plotH = Math.max(150, height - padTop - padBottom);

    const cfg = DIRECTION_CONFIG[this.direction] || DIRECTION_CONFIG.S;
    const centerAz = cfg.centerAz;

    // 將 (dAz ∈ [-90, 90], alt ∈ [0, 90]) 映射到平面天幕像素 (x, y)
    const projectAltAz = (az, alt) => {
      const dAz = this._deltaAz(az, centerAz);
      const x = padLeft + ((dAz + 90) / 180) * plotW;
      const y = padTop + ((90 - alt) / 90) * plotH;
      return { x, y, dAz, alt };
    };

    // 1. 依據太陽仰角繪製深邃星空或晨昏白晝天幕背景
    const sunAlt = this.ephemeris.sun.altitude;
    const skyGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    if (sunAlt > 6) {
      // 白晝偏深藍觀星模擬背景
      skyGrad.addColorStop(0, '#0c1e3e');
      skyGrad.addColorStop(0.6, '#153264');
      skyGrad.addColorStop(1, '#1e4682');
    } else if (sunAlt > -12) {
      // 晨昏暮光
      skyGrad.addColorStop(0, '#070d1d');
      skyGrad.addColorStop(0.7, '#111c38');
      skyGrad.addColorStop(1, '#2b244d');
    } else {
      // 夜晚深邃星空
      skyGrad.addColorStop(0, '#03060f');
      skyGrad.addColorStop(0.65, '#081021');
      skyGrad.addColorStop(1, '#0e1b33');
    }

    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = skyGrad;
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    // 裁切平面天幕內部區域 (左右橫跨 180°，下 0° 至上 90°)
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    const astroTime = Astronomy.MakeTime(this.ephemeris.date);
    const observer = new Astronomy.Observer(this.ephemeris.lat, this.ephemeris.lon, 0);

    // 2. 繪製地平經緯網格 (仰角 0° ~ 90° 每 15° 一條水平線；方位角 -90° ~ +90° 每 15° 一條垂直線)
    ctx.lineWidth = 1;
    for (let alt = 0; alt <= 90; alt += 15) {
      const y = padTop + ((90 - alt) / 90) * plotH;
      ctx.strokeStyle = alt % 30 === 0 ? 'rgba(100, 148, 218, 0.28)' : 'rgba(100, 148, 218, 0.12)';
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }

    for (let dAz = -90; dAz <= 90; dAz += 15) {
      const x = padLeft + ((dAz + 90) / 180) * plotW;
      const isCenter = dAz === 0;
      ctx.strokeStyle = isCenter
        ? 'rgba(56, 189, 248, 0.45)'
        : dAz % 30 === 0
        ? 'rgba(100, 148, 218, 0.28)'
        : 'rgba(100, 148, 218, 0.12)';
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();
    }

    // 3. 繪製背景繁星
    this.bgStars.forEach((s) => {
      const { az, alt } = this._raDecToAltAz(s.ra, s.dec, astroTime, observer);
      if (alt < 0) return;
      const p = projectAltAz(az, alt);
      if (Math.abs(p.dAz) > 92) return;
      ctx.fillStyle = `rgba(226, 232, 240, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. 繪製天球赤道弧線 (Celestial Equator) 與黃道弧線 (Ecliptic)
    this._drawCelestialCurve(
      ctx,
      (deg) => {
        const ra = deg / 15;
        return this._raDecToAltAz(ra, 0, astroTime, observer);
      },
      projectAltAz,
      'rgba(56, 189, 248, 0.45)',
      [6, 4]
    );

    const eps = (23.43928 * Math.PI) / 180;
    this._drawCelestialCurve(
      ctx,
      (lamDeg) => {
        const lam = (lamDeg * Math.PI) / 180;
        const sinDec = Math.sin(lam) * Math.sin(eps);
        const dec = (Math.asin(sinDec) * 180) / Math.PI;
        const yEq = Math.sin(lam) * Math.cos(eps);
        const xEq = Math.cos(lam);
        let ra = (Math.atan2(yEq, xEq) * 12) / Math.PI;
        if (ra < 0) ra += 24;
        return this._raDecToAltAz(ra, dec, astroTime, observer);
      },
      projectAltAz,
      'rgba(245, 158, 11, 0.78)',
      []
    );

    this.interactiveTargets = [];

    // 5. 繪製黃道十二宮與其他代表星座連線與恆星
    const drawConstellations = (list, isZodiac) => {
      list.forEach((c) => {
        const projectedStars = c.stars.map((st) => {
          const { az, alt } = this._raDecToAltAz(st.ra, st.dec, astroTime, observer);
          return {
            ...st,
            ...projectAltAz(az, alt),
            az
          };
        });

        // 星座連線
        ctx.strokeStyle = isZodiac ? 'rgba(245, 158, 11, 0.85)' : 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = isZodiac ? 1.8 : 1.2;
        c.lines.forEach(([i, j]) => {
          const a = projectedStars[i];
          const b = projectedStars[j];
          if (!a || !b) return;
          // 避免跨 180° 邊界拉出長橫線
          if (Math.abs(a.dAz - b.dAz) > 100) return;
          if ((a.alt < -5 && b.alt < -5) || (Math.abs(a.dAz) > 98 && Math.abs(b.dAz) > 98)) return;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        });

        // 繪製恆星圓點
        let visibleCount = 0;
        let sumX = 0;
        let sumY = 0;

        projectedStars.forEach((st) => {
          if (st.alt < 0 || Math.abs(st.dAz) > 90) return;
          visibleCount++;
          sumX += st.x;
          sumY += st.y;

          const r = Math.max(2.2, 5.2 - st.mag * 0.85);
          ctx.fillStyle = isZodiac ? '#fef08a' : '#bae6fd';
          ctx.beginPath();
          ctx.arc(st.x, st.y, r, 0, Math.PI * 2);
          ctx.fill();

          this.interactiveTargets.push({
            x: st.x,
            y: st.y,
            hitRadius: 10,
            info: {
              type: 'Star',
              title: `✦ ${st.name}`,
              subtitle: `${c.symbol ? c.symbol + ' ' : ''}${c.nameZh} (${c.nameEn})`,
              details: `地平仰角: ${st.alt.toFixed(1)}° | 方位角: ${st.az.toFixed(1)}°\n赤經: ${formatRA(st.ra)} | 赤緯: ${st.dec.toFixed(2)}° | 視星等: ${st.mag}`
            }
          });
        });

        // 繪製星座中英文標籤
        if (visibleCount > 0) {
          const cx = sumX / visibleCount;
          const cy = sumY / visibleCount - 12;
          const labelText = isZodiac
            ? `${c.symbol} ${c.nameZh} ${c.nameEn}`
            : `${c.nameZh} ${c.nameEn}`;

          ctx.font = '700 12px "Songti TC", "STSong", "PMingLiU", serif';
          const tw = ctx.measureText(labelText).width;
          ctx.fillStyle = isZodiac ? 'rgba(45, 28, 6, 0.82)' : 'rgba(7, 11, 20, 0.72)';
          ctx.strokeStyle = isZodiac ? 'rgba(245, 158, 11, 0.6)' : 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(cx - tw / 2 - 6, cy - 10, tw + 12, 18, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isZodiac ? '#fef08a' : '#e2e8f0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, cx, cy);
        }
      });
    };

    drawConstellations(OTHER_CONSTELLATIONS, false);
    drawConstellations(ZODIAC_CONSTELLATIONS, true);

    // 6. 繪製太陽、月球與各大行星在天幕上的位置
    this.ephemeris.geocentricPlanets.forEach((p) => {
      if (p.altitude < 0) return;
      const pt = projectAltAz(p.azimuth, p.altitude);
      if (Math.abs(pt.dAz) > 90) return;

      const hexColor = '#' + p.color.toString(16).padStart(6, '0');
      ctx.fillStyle = hexColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '700 12px "Songti TC", "STSong", "PMingLiU", serif';
      ctx.fillStyle = '#7dd3fc';
      ctx.textAlign = 'left';
      ctx.fillText(`${p.symbol} ${p.nameZh}`, pt.x + 8, pt.y + 3);

      this.interactiveTargets.push({
        x: pt.x,
        y: pt.y,
        hitRadius: 12,
        info: {
          type: 'Planet',
          title: `${p.symbol} ${p.nameZh} (${p.nameEn})`,
          subtitle: `仰角 ${p.altitude.toFixed(1)}° | 方位角 ${p.azimuth.toFixed(1)}°`,
          details: `距離地球 ${p.distAU.toFixed(2)} AU | 赤經 ${formatRA(p.ra)} | 赤緯 ${p.dec.toFixed(2)}°`
        }
      });
    });

    // 太陽
    if (this.ephemeris.sun.altitude >= 0) {
      const sp = projectAltAz(this.ephemeris.sun.azimuth, this.ephemeris.sun.altitude);
      if (Math.abs(sp.dAz) <= 92) {
        const sunGlow = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, 18);
        sunGlow.addColorStop(0, 'rgba(250, 204, 21, 1)');
        sunGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.45)');
        sunGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = sunGlow;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 7.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '700 12px "Songti TC", "STSong", "PMingLiU", serif';
        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'left';
        ctx.fillText('☀ 太陽 Sun', sp.x + 10, sp.y + 4);

        this.interactiveTargets.push({
          x: sp.x,
          y: sp.y,
          hitRadius: 14,
          info: {
            type: 'Body',
            title: '☀ 太陽 (Sun)',
            subtitle: `仰角 ${this.ephemeris.sun.altitude.toFixed(1)}° | 方位角 ${this.ephemeris.sun.azimuth.toFixed(1)}°`,
            details: `位於 ${this.ephemeris.sun.zodiac.symbol} ${this.ephemeris.sun.zodiac.nameZh} (${this.ephemeris.sun.zodiac.nameEn})`
          }
        });
      }
    }

    // 月球
    if (this.ephemeris.moon.altitude >= 0) {
      const mp = projectAltAz(this.ephemeris.moon.azimuth, this.ephemeris.moon.altitude);
      if (Math.abs(mp.dAz) <= 92) {
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.arc(mp.x, mp.y, 6.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '700 12px "Songti TC", "STSong", "PMingLiU", serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'left';
        ctx.fillText('🌙 月球 Moon', mp.x + 10, mp.y + 4);

        this.interactiveTargets.push({
          x: mp.x,
          y: mp.y,
          hitRadius: 14,
          info: {
            type: 'Body',
            title: '🌙 月球 (Moon)',
            subtitle: `仰角 ${this.ephemeris.moon.altitude.toFixed(1)}° | 方位角 ${this.ephemeris.moon.azimuth.toFixed(1)}°`,
            details: `月相：${this.ephemeris.moon.phaseName} (照明率 ${(this.ephemeris.moon.fraction * 100).toFixed(1)}%)`
          }
        });
      }
    }

    ctx.restore(); // 結束天幕裁切區

    // 7. 繪製地平線地面剪影與外框刻度 (下由地平線 0° 起，上至頭頂 90°，左右橫跨 180°)
    ctx.fillStyle = '#071513';
    ctx.fillRect(padLeft, padTop + plotH, plotW, height - (padTop + plotH));

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);

    // 8. 繪製左軸仰角刻度 (0° 地平線 ~ 90° 頭頂天頂)
    ctx.font = '700 12px "Songti TC", "STSong", "PMingLiU", serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let alt = 0; alt <= 90; alt += 15) {
      const y = padTop + ((90 - alt) / 90) * plotH;
      const label = alt === 0 ? '地平 0°' : alt === 90 ? '天頂 90°' : `${alt}°`;
      ctx.fillText(label, padLeft - 8, y);
    }

    // 9. 繪製下軸方位角刻度 (左右橫跨 180°：-90° ~ 0° ~ +90°)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let dAz = -90; dAz <= 90; dAz += 30) {
      const x = padLeft + ((dAz + 90) / 180) * plotW;
      const trueAz = ((centerAz + dAz) % 360 + 360) % 360;
      let text = `${trueAz}°`;
      if (dAz === -90) text = cfg.leftLabel;
      else if (dAz === 0) text = `▲ ${cfg.centerLabel}`;
      else if (dAz === 90) text = cfg.rightLabel;

      ctx.fillStyle = dAz === 0 ? '#fde68a' : dAz === -90 || dAz === 90 ? '#fca5a5' : '#94a3b8';
      ctx.font = dAz === 0 || Math.abs(dAz) === 90
        ? '700 14px "Songti TC", "STSong", "PMingLiU", serif'
        : '400 12px "Songti TC", "STSong", "PMingLiU", serif';
      ctx.fillText(text, x, padTop + plotH + 10);
    }

    // 頂部天頂中央提示
    ctx.fillStyle = '#93c5fd';
    ctx.font = '700 14px "Songti TC", "STSong", "PMingLiU", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `✦ ${cfg.nameZh} (${cfg.nameEn}) — 下由地平線 0° 起、上至頭頂天頂 90°、左右橫跨 180°`,
      padLeft + plotW / 2,
      padTop - 8
    );

    ctx.restore();
  }

  _drawCelestialCurve(ctx, sampleFn, projectFn, strokeStyle, dash) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dash);
    ctx.beginPath();

    let prev = null;
    for (let deg = 0; deg <= 360; deg += 2) {
      const { az, alt } = sampleFn(deg);
      const pt = projectFn(az, alt);
      const inside = pt.alt >= -2 && Math.abs(pt.dAz) <= 95;
      if (inside) {
        if (prev && Math.abs(pt.dAz - prev.dAz) < 30) {
          ctx.lineTo(pt.x, pt.y);
        } else {
          ctx.moveTo(pt.x, pt.y);
        }
        prev = pt;
      } else {
        prev = null;
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}
