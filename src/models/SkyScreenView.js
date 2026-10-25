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
 * - 支援滑鼠 Hover 到任何星體（太陽、月球、行星、恆星、星座標籤）或軌跡線（黃道線、赤道線、星座連線、地平線、子午線）即時跳出說明視窗解說
 */
const DIRECTION_CONFIG = {
  N: { centerAz: 0, nameZh: '北方天幕', nameEn: 'North Sky', leftLabel: '西 W (270°)', centerLabel: '北 N (0°)', rightLabel: '東 E (90°)' },
  E: { centerAz: 90, nameZh: '東方天幕', nameEn: 'East Sky', leftLabel: '北 N (0°)', centerLabel: '東 E (90°)', rightLabel: '南 S (180°)' },
  S: { centerAz: 180, nameZh: '南方天幕', nameEn: 'South Sky', leftLabel: '東 E (90°)', centerLabel: '南 S (180°)', rightLabel: '西 W (270°)' },
  W: { centerAz: 270, nameZh: '西方天幕', nameEn: 'West Sky', leftLabel: '南 S (180°)', centerLabel: '西 W (270°)', rightLabel: '北 N (0°)' }
};

function distToSegmentSq(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

export class SkyScreenView {
  constructor(canvas, tooltipEl, onSelectObject) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tooltipEl = tooltipEl;
    this.onSelectObject = onSelectObject;

    this.active = false;
    this.direction = 'S'; // 'E' | 'S' | 'W' | 'N'
    this.ephemeris = null;

    // 供滑鼠 Hover 與點擊偵測的點目標與線段目標
    this.pointTargets = [];
    this.lineTargets = [];

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

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      this._handlePointerMove(e);
    });

    this.canvas.addEventListener('pointerleave', () => {
      this._hideTooltip();
    });

    this.canvas.addEventListener('click', (e) => {
      if (!this.active) return;
      const hit = this._findHitTarget(e);
      if (hit && this.onSelectObject) {
        this.onSelectObject(hit);
      }
    });
  }

  _findHitTarget(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // 1. 優先偵測星體與星座標籤 (Point / Box targets)
    for (let i = this.pointTargets.length - 1; i >= 0; i--) {
      const item = this.pointTargets[i];
      if (item.box) {
        if (
          mx >= item.box.x &&
          mx <= item.box.x + item.box.w &&
          my >= item.box.y &&
          my <= item.box.y + item.box.h
        ) {
          return item.info;
        }
      } else {
        const dx = mx - item.x;
        const dy = my - item.y;
        if (dx * dx + dy * dy <= item.hitRadius * item.hitRadius) {
          return item.info;
        }
      }
    }

    // 2. 次優先偵測軌跡線與星座連線 (Line segment targets)
    const maxLineDistSq = 7 * 7; // 距離線段 7px 內即觸發
    let bestLineInfo = null;
    let bestDistSq = maxLineDistSq;

    for (let i = 0; i < this.lineTargets.length; i++) {
      const seg = this.lineTargets[i];
      const dSq = distToSegmentSq(mx, my, seg.x1, seg.y1, seg.x2, seg.y2);
      if (dSq <= bestDistSq) {
        bestDistSq = dSq;
        bestLineInfo = seg.info;
      }
    }

    return bestLineInfo;
  }

  _handlePointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const info = this._findHitTarget(e);
    if (!info) {
      this.canvas.style.cursor = 'default';
      this._hideTooltip();
      return;
    }

    this.canvas.style.cursor = 'pointer';
    if (this.onSelectObject) {
      this.onSelectObject(info);
    }

    if (this.tooltipEl) {
      const lines = info.details ? info.details.replace(/\n/g, '<br/>') : '';
      this.tooltipEl.innerHTML = `
        <div class="tt-title">${info.title}</div>
        <div class="tt-sub">${info.subtitle || ''}</div>
        <div class="tt-body">${lines}</div>
      `;
      this.tooltipEl.classList.remove('hidden');

      // 計算浮動視窗位置，避免超出天幕右緣或下緣
      const parentW = this.canvas.parentElement.clientWidth;
      const parentH = this.canvas.parentElement.clientHeight;
      const ttW = this.tooltipEl.offsetWidth || 260;
      const ttH = this.tooltipEl.offsetHeight || 95;

      let left = mx + 16;
      let top = my + 16;
      if (left + ttW + 12 > parentW) left = Math.max(12, mx - ttW - 14);
      if (top + ttH + 12 > parentH) top = Math.max(12, my - ttH - 14);

      this.tooltipEl.style.left = `${left}px`;
      this.tooltipEl.style.top = `${top}px`;
    }
  }

  _hideTooltip() {
    if (this.tooltipEl) {
      this.tooltipEl.classList.add('hidden');
    }
  }

  setDirection(dir) {
    if (DIRECTION_CONFIG[dir]) {
      this.direction = dir;
      if (this.active) this.render();
    }
  }

  setActive(flag) {
    this.active = flag;
    if (!flag) {
      this._hideTooltip();
    } else {
      this.render();
    }
  }

  update(ephemeris) {
    this.ephemeris = ephemeris;
    if (this.active) {
      this.render();
    }
  }

  _raDecToAltAz(raHours, decDeg, astroTime, observer) {
    const hor = Astronomy.Horizon(astroTime, observer, raHours, decDeg, 'normal');
    return { az: hor.azimuth, alt: hor.altitude };
  }

  _deltaAz(az, centerAz) {
    return ((az - centerAz + 540) % 360) - 180;
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

    const padLeft = 64;
    const padRight = 48;
    const padTop = 66;
    const padBottom = 64;

    const plotW = Math.max(200, width - padLeft - padRight);
    const plotH = Math.max(150, height - padTop - padBottom);

    const cfg = DIRECTION_CONFIG[this.direction] || DIRECTION_CONFIG.S;
    const centerAz = cfg.centerAz;

    const projectAltAz = (az, alt) => {
      const dAz = this._deltaAz(az, centerAz);
      const x = padLeft + ((dAz + 90) / 180) * plotW;
      const y = padTop + ((90 - alt) / 90) * plotH;
      return { x, y, dAz, alt };
    };

    this.pointTargets = [];
    this.lineTargets = [];

    // 1. 依據太陽是否在日落前 (sunAlt >= 0°) 或日落後 (sunAlt < 0°) 明確區分天幕背景顏色
    const sunAlt = this.ephemeris.sun.altitude;
    const isDaytimeBeforeSunset = sunAlt >= 0;
    const skyGrad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);

    if (isDaytimeBeforeSunset) {
      if (sunAlt >= 10) {
        // 日落前（白晝晴空）：明亮蔚藍天幕
        skyGrad.addColorStop(0, '#1d63b8');
        skyGrad.addColorStop(0.55, '#2b82d9');
        skyGrad.addColorStop(1, '#58ace8');
      } else {
        // 日落前夕／日出晨曦（0° <= 太陽仰角 < 10°）：上方亮藍、地平線帶夕陽暖金光暈
        skyGrad.addColorStop(0, '#1e5b9e');
        skyGrad.addColorStop(0.55, '#367ec0');
        skyGrad.addColorStop(0.85, '#6fa0c7');
        skyGrad.addColorStop(1, '#c87d46');
      }
    } else if (sunAlt >= -6) {
      // 日落後（民用暮光階段）：轉為深沉夜幕灰藍
      skyGrad.addColorStop(0, '#161d29');
      skyGrad.addColorStop(0.65, '#222c3c');
      skyGrad.addColorStop(1, '#364152');
    } else {
      // 日落後（夜晚星空）：夜幕灰黑，與日落前的亮藍天幕形成鮮明對比
      skyGrad.addColorStop(0, '#11161f');
      skyGrad.addColorStop(0.6, '#1b2230');
      skyGrad.addColorStop(1, '#283244');
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

    // 2. 繪製地平經緯網格並註冊中心方位子午線與地平線 Hover 說明
    const gridMajorColor = isDaytimeBeforeSunset ? 'rgba(255, 255, 255, 0.30)' : 'rgba(148, 163, 184, 0.25)';
    const gridMinorColor = isDaytimeBeforeSunset ? 'rgba(255, 255, 255, 0.15)' : 'rgba(148, 163, 184, 0.11)';

    ctx.lineWidth = 1;
    for (let alt = 0; alt <= 90; alt += 15) {
      const y = padTop + ((90 - alt) / 90) * plotH;
      ctx.strokeStyle = alt % 30 === 0 ? gridMajorColor : gridMinorColor;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      ctx.stroke();
    }

    for (let dAz = -90; dAz <= 90; dAz += 15) {
      const x = padLeft + ((dAz + 90) / 180) * plotW;
      const isCenter = dAz === 0;
      ctx.strokeStyle = isCenter
        ? isDaytimeBeforeSunset
          ? 'rgba(254, 240, 138, 0.65)'
          : 'rgba(56, 189, 248, 0.45)'
        : dAz % 30 === 0
        ? gridMajorColor
        : gridMinorColor;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();

      if (isCenter) {
        this.lineTargets.push({
          x1: x,
          y1: padTop,
          x2: x,
          y2: padTop + plotH,
          info: {
            type: 'Line',
            title: `🧭 ${cfg.centerLabel} 中心方位線`,
            subtitle: `方位角 Azimuth = ${centerAz}° (天頂垂直基準線)`,
            details: `代表觀測者正對 ${cfg.centerLabel} 的垂直視線切面，由地平線 (0°) 直達頭頂天頂 (90°)。`
          }
        });
      }
    }

    // 地平線 (Altitude = 0°) Hover 說明
    this.lineTargets.push({
      x1: padLeft,
      y1: padTop + plotH,
      x2: padLeft + plotW,
      y2: padTop + plotH,
      info: {
        type: 'Line',
        title: '🌄 觀測者地平線 (Local Horizon)',
        subtitle: `地平仰角 Altitude = 0° | 橫跨 ${cfg.leftLabel} 至 ${cfg.rightLabel}`,
        details: `觀測者所在地 (${this.ephemeris.lat.toFixed(2)}°N, ${this.ephemeris.lon.toFixed(2)}°E) 的地面水平切線，高於此線的天體才在當地地平線上可見。`
      }
    });

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

    // 4. 繪製天球赤道弧線 (Celestial Equator) 與黃道弧線 (Ecliptic)，並註冊軌跡線段供 Hover 解說
    this._drawCelestialCurve(
      ctx,
      (deg) => {
        const ra = deg / 15;
        return this._raDecToAltAz(ra, 0, astroTime, observer);
      },
      projectAltAz,
      'rgba(56, 189, 248, 0.55)',
      [6, 4],
      {
        type: 'Trajectory',
        title: '🌐 天球赤道 (Celestial Equator)',
        subtitle: '赤緯 Declination = 0°',
        details: '地球赤道面無限延伸至天球所形成的平面圓弧。天球赤道與黃道相交於春分點與秋分點（夾角約 23.44°）。'
      }
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
      'rgba(245, 158, 11, 0.85)',
      [],
      {
        type: 'Trajectory',
        title: '☀ 黃道軌跡線 (Ecliptic Path)',
        subtitle: `黃赤交角 23.44° | 目前太陽位於 ${this.ephemeris.sun.zodiac.symbol} ${this.ephemeris.sun.zodiac.nameZh}`,
        details: '太陽一年中在天球背景上視運動所行經的軌跡，黃道十二宮星座即依序分佈於此金色軌跡帶上，月球與八大行星也都在黃道附近運行。'
      }
    );

    // 5. 繪製當日太陽與月球的地平軌跡弧線 (Daily Diurnal Path) 並支援 Hover 解說
    this._drawDailyBodyPath(
      ctx,
      Astronomy.Body.Sun,
      observer,
      projectAltAz,
      'rgba(250, 204, 21, 0.42)',
      [3, 4],
      {
        type: 'Trajectory',
        title: '☀ 今日太陽周日運動軌跡 (Solar Diurnal Arc)',
        subtitle: `觀測日期：${this.ephemeris.date.toLocaleDateString('zh-TW')}`,
        details: '因地球自轉，太陽今日在當地天幕由東向西升落所劃出的視運動弧線。'
      }
    );

    this._drawDailyBodyPath(
      ctx,
      Astronomy.Body.Moon,
      observer,
      projectAltAz,
      'rgba(147, 197, 253, 0.42)',
      [2, 4],
      {
        type: 'Trajectory',
        title: '🌙 今日月球周日運動軌跡 (Lunar Diurnal Arc)',
        subtitle: `目前月相：${this.ephemeris.moon.phaseName}`,
        details: '月球今日在當地天幕由東向西升落所劃出的周日視運動軌跡弧線。'
      }
    );

    // 6. 繪製黃道十二宮與其他代表星座連線與恆星
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

        const constInfo = {
          type: 'Constellation',
          title: `${c.symbol ? c.symbol + ' ' : ''}${c.nameZh} (${c.nameEn})`,
          subtitle: isZodiac ? `黃道十二宮星座 | 黃經起始 ${c.eclipticStart}°` : '全天重要指標星座',
          details: c.desc
        };

        // 星座連線 (同時加入 lineTargets 讓滑鼠 Hover 到連線時跳出星座解說)
        ctx.strokeStyle = isZodiac ? 'rgba(245, 158, 11, 0.85)' : 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = isZodiac ? 1.8 : 1.2;
        c.lines.forEach(([i, j]) => {
          const a = projectedStars[i];
          const b = projectedStars[j];
          if (!a || !b) return;
          if (Math.abs(a.dAz - b.dAz) > 100) return;
          if ((a.alt < -5 && b.alt < -5) || (Math.abs(a.dAz) > 98 && Math.abs(b.dAz) > 98)) return;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          this.lineTargets.push({
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            info: {
              type: 'ConstellationLine',
              title: `${c.symbol ? c.symbol + ' ' : ''}${c.nameZh} (${c.nameEn}) 星座連線`,
              subtitle: `連接「${a.name.split(' ')[0]}」與「${b.name.split(' ')[0]}」`,
              details: c.desc
            }
          });
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

          this.pointTargets.push({
            x: st.x,
            y: st.y,
            hitRadius: 11,
            info: {
              type: 'Star',
              title: `✦ ${st.name}`,
              subtitle: `所屬星座：${c.symbol ? c.symbol + ' ' : ''}${c.nameZh} (${c.nameEn})`,
              details: `地平仰角: ${st.alt.toFixed(1)}° | 方位角: ${st.az.toFixed(1)}°\n赤經: ${formatRA(st.ra)} | 赤緯: ${st.dec.toFixed(2)}° | 視星等: ${st.mag} 等\n${c.desc}`
            }
          });
        });

        // 繪製星座中英文標籤 (支援滑鼠 Hover 到標籤框解說該星座)
        if (visibleCount > 0) {
          const cx = sumX / visibleCount;
          const cy = sumY / visibleCount - 12;
          const labelText = isZodiac
            ? `${c.symbol} ${c.nameZh} ${c.nameEn}`
            : `${c.nameZh} ${c.nameEn}`;

          ctx.font = '700 12px "Songti TC", "STSong", "PMingLiU", serif';
          const tw = ctx.measureText(labelText).width;
          const bx = cx - tw / 2 - 6;
          const by = cy - 10;
          const bw = tw + 12;
          const bh = 18;

          ctx.fillStyle = isZodiac ? 'rgba(45, 28, 6, 0.82)' : 'rgba(7, 11, 20, 0.72)';
          ctx.strokeStyle = isZodiac ? 'rgba(245, 158, 11, 0.6)' : 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isZodiac ? '#fef08a' : '#e2e8f0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, cx, cy);

          this.pointTargets.push({
            box: { x: bx, y: by, w: bw, h: bh },
            info: constInfo
          });
        }
      });
    };

    drawConstellations(OTHER_CONSTELLATIONS, false);
    drawConstellations(ZODIAC_CONSTELLATIONS, true);

    // 7. 繪製太陽、月球與各大行星在天幕上的位置
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

      this.pointTargets.push({
        x: pt.x,
        y: pt.y,
        hitRadius: 13,
        info: {
          type: 'Planet',
          bodyId: p.id,
          title: `${p.symbol} ${p.nameZh} (${p.nameEn})`,
          subtitle: `地平仰角 ${p.altitude.toFixed(1)}° | 方位角 ${p.azimuth.toFixed(1)}°`,
          details: `距離地球: ${p.distAU.toFixed(2)} AU\n赤經: ${formatRA(p.ra)} | 赤緯: ${p.dec.toFixed(2)}°`
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

        this.pointTargets.push({
          x: sp.x,
          y: sp.y,
          hitRadius: 16,
          info: {
            type: 'Body',
            bodyId: 'Sun',
            title: '☀ 太陽 (Sun)',
            subtitle: `地平仰角 ${this.ephemeris.sun.altitude.toFixed(1)}° | 方位角 ${this.ephemeris.sun.azimuth.toFixed(1)}°`,
            details: `目前位於黃道：${this.ephemeris.sun.zodiac.symbol} ${this.ephemeris.sun.zodiac.nameZh} (${this.ephemeris.sun.zodiac.nameEn})\n太陽黃經: ${this.ephemeris.sun.elon.toFixed(2)}° | 赤經: ${formatRA(this.ephemeris.sun.ra)}`
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

        this.pointTargets.push({
          x: mp.x,
          y: mp.y,
          hitRadius: 15,
          info: {
            type: 'Body',
            bodyId: 'Moon',
            title: '🌙 月球 (Moon)',
            subtitle: `地平仰角 ${this.ephemeris.moon.altitude.toFixed(1)}° | 方位角 ${this.ephemeris.moon.azimuth.toFixed(1)}°`,
            details: `月相：${this.ephemeris.moon.phaseName} (照明率 ${(this.ephemeris.moon.fraction * 100).toFixed(1)}%)\n赤經: ${formatRA(this.ephemeris.moon.ra)} | 赤緯: ${this.ephemeris.moon.dec.toFixed(2)}°`
          }
        });
      }
    }

    ctx.restore(); // 結束天幕裁切區

    // 8. 繪製地平線地面剪影與外框刻度
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

    // 9. 繪製左軸仰角刻度 (0° 地平線 ~ 90° 頭頂天頂)
    ctx.font = '700 12px "Songti TC", "STSong", "PMingLiU", serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let alt = 0; alt <= 90; alt += 15) {
      const y = padTop + ((90 - alt) / 90) * plotH;
      const label = alt === 0 ? '地平 0°' : alt === 90 ? '天頂 90°' : `${alt}°`;
      ctx.fillText(label, padLeft - 8, y);
    }

    // 10. 繪製下軸方位角刻度 (左右橫跨 180°：-90° ~ 0° ~ +90°)
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

    // 頂部天頂中央提示（標示日落前白晝天幕或日落後夜幕星空）
    const skyStatusText = isDaytimeBeforeSunset
      ? `☀ 日落前・白晝晴空 (太陽仰角 +${sunAlt.toFixed(1)}°)`
      : `🌙 日落後・夜幕星空 (太陽仰角 ${sunAlt.toFixed(1)}°)`;
    ctx.fillStyle = isDaytimeBeforeSunset ? '#fde68a' : '#93c5fd';
    ctx.font = '700 14px "Songti TC", "STSong", "PMingLiU", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `✦ ${cfg.nameZh} (${cfg.nameEn}) ｜ ${skyStatusText} — 游標移至星體或軌跡線可檢視解說`,
      padLeft + plotW / 2,
      padTop - 8
    );

    ctx.restore();
  }

  _drawCelestialCurve(ctx, sampleFn, projectFn, strokeStyle, dash, hoverInfo = null) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.6;
    ctx.setLineDash(dash);
    ctx.beginPath();

    let prev = null;
    for (let deg = 0; deg <= 360; deg += 3) {
      const { az, alt } = sampleFn(deg);
      const pt = projectFn(az, alt);
      const inside = pt.alt >= -2 && Math.abs(pt.dAz) <= 95;
      if (inside) {
        if (prev && Math.abs(pt.dAz - prev.dAz) < 30) {
          ctx.lineTo(pt.x, pt.y);
          if (hoverInfo) {
            this.lineTargets.push({
              x1: prev.x,
              y1: prev.y,
              x2: pt.x,
              y2: pt.y,
              info: hoverInfo
            });
          }
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

  _drawDailyBodyPath(ctx, body, observer, projectFn, strokeStyle, dash, hoverInfo) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.4;
    ctx.setLineDash(dash);
    ctx.beginPath();

    const startOfDay = new Date(this.ephemeris.date);
    startOfDay.setHours(0, 0, 0, 0);

    let prev = null;
    for (let m = 0; m <= 1440; m += 20) {
      const sampleDate = new Date(startOfDay.getTime() + m * 60000);
      const t = Astronomy.MakeTime(sampleDate);
      const eq = Astronomy.Equator(body, t, observer, true, true);
      const hor = Astronomy.Horizon(t, observer, eq.ra, eq.dec, 'normal');
      const pt = projectFn(hor.azimuth, hor.altitude);

      if (pt.alt >= -2 && Math.abs(pt.dAz) <= 95) {
        if (prev && Math.abs(pt.dAz - prev.dAz) < 30) {
          ctx.lineTo(pt.x, pt.y);
          if (hoverInfo) {
            this.lineTargets.push({
              x1: prev.x,
              y1: prev.y,
              x2: pt.x,
              y2: pt.y,
              info: hoverInfo
            });
          }
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
