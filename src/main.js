import { SceneManager } from './core/SceneManager.js?v=20261020_09';
import { SkyScreenView } from './models/SkyScreenView.js?v=20261020_09';
import { computeEphemeris, formatRA } from './utils/astronomy.js?v=20261020_09';
import { ZODIAC_CONSTELLATIONS } from './data/zodiacData.js?v=20261020_09';

// 應用程式全域狀態
const state = {
  scale: 'celestial', // 'celestial' | 'solar' | 'horizon'
  skyScreenActive: false,
  skyDirection: 'S',
  lat: 24.8136,
  lon: 121.0322,
  date: new Date(),
  isPlaying: false,
  speedMultiplier: 3600, // 預設每秒推進 1 小時
  lastFrameTime: performance.now()
};

// DOM 元素快取
const els = {
  canvasContainer: document.getElementById('canvas-container'),
  skyScreenOverlay: document.getElementById('sky-screen-overlay'),
  skyScreenCanvas: document.getElementById('sky-screen-canvas'),
  skyScreenTooltip: document.getElementById('sky-screen-tooltip'),
  selectSkyDir: document.getElementById('select-sky-dir'),
  btnExecSky: document.getElementById('btn-exec-sky'),
  btnExitSkyMain: document.getElementById('btn-exit-sky-main'),
  btnExitSkySide: document.getElementById('btn-exit-sky-side'),
  interactionToolbar: document.getElementById('interaction-toolbar'),
  scaleBtns: document.querySelectorAll('.scale-btn'),
  controlsCelestial: document.getElementById('controls-celestial'),
  controlsSolar: document.getElementById('controls-solar'),
  controlsHorizon: document.getElementById('controls-horizon'),
  presetLocation: document.getElementById('preset-location'),
  inputLat: document.getElementById('input-lat'),
  inputLon: document.getElementById('input-lon'),
  inputDate: document.getElementById('input-date'),
  inputTime: document.getElementById('input-time'),
  lunarDateNote: document.getElementById('lunar-date-note'),
  sliderDayTime: document.getElementById('slider-day-time'),
  sliderTimeLabel: document.getElementById('slider-time-label'),
  btnNow: document.getElementById('btn-now'),
  btnPlay: document.getElementById('btn-play'),
  selectSpeed: document.getElementById('select-speed'),
  selectSolarTarget: document.getElementById('select-solar-target'),

  // 左下模型資訊欄
  infoScaleBadge: document.getElementById('info-scale-badge'),
  infoZodiacSign: document.getElementById('info-zodiac-sign'),
  infoZodiacDeg: document.getElementById('info-zodiac-deg'),
  infoSunAltAz: document.getElementById('info-sun-altaz'),
  infoMoonAltAz: document.getElementById('info-moon-altaz'),
  infoMoonPhase: document.getElementById('info-moon-phase'),
  infoLst: document.getElementById('info-lst'),
  selectionDetails: document.getElementById('selection-details'),

  // 右側頂部與底部工具列
  l1ViewGroup: document.getElementById('l1-view-group'),
  btnL1ZenithUp: document.getElementById('btn-l1-zenith-up'),
  btnL1HorizonTop: document.getElementById('btn-l1-horizon-top'),
  btnSideZenithUp: document.getElementById('btn-side-zenith-up'),
  btnSideHorizonTop: document.getElementById('btn-side-horizon-top'),
  btnModeOrbit: document.getElementById('btn-mode-orbit'),
  btnModePan: document.getElementById('btn-mode-pan'),
  btnResetCam: document.getElementById('btn-reset-cam'),
  toolbarHint: document.getElementById('toolbar-hint'),
  zodiacQuickbar: document.getElementById('zodiac-quickbar'),
  zodiacPills: document.getElementById('zodiac-pills'),
  planetQuickbar: document.getElementById('planet-quickbar'),
  planetPills: document.getElementById('planet-pills')
};

const defaultSelectionTipHtml =
  '尚未選取特定天體。滑鼠懸停於星座或天體上可即時預覽進一步資訊，左鍵點擊即可聚焦放大（按 <b>Esc</b> 退出高亮狀態）。';

let selectedObjectInfo = null;

// 初始化 3D 場景管理器与 L1 平面天幕投影器
const sceneManager = new SceneManager(els.canvasContainer, {
  onControlModeChange: (mode) => updateControlModeUI(mode),
  onSelectObject: (info) => {
    selectedObjectInfo = info;
    renderSelectionInfo(info);
  },
  onClearSelection: () => {
    selectedObjectInfo = null;
    document.querySelectorAll('.zodiac-pill, .planet-pill').forEach((p) => p.classList.remove('active'));
    els.selectionDetails.innerHTML = defaultSelectionTipHtml;
  },
  onHoverObject: (info) => {
    renderSelectionInfo(info);
  },
  onClearHover: () => {
    if (selectedObjectInfo) {
      renderSelectionInfo(selectedObjectInfo);
    } else {
      els.selectionDetails.innerHTML = defaultSelectionTipHtml;
    }
  },
  onSolarTargetChange: (bodyId) => {
    els.selectSolarTarget.value = bodyId;
    updateQuickbarActivePill(bodyId);
  }
});

const skyScreenView = new SkyScreenView(
  els.skyScreenCanvas,
  els.skyScreenTooltip,
  (info) => renderSelectionInfo(info)
);

// 啟動或關閉 L1 平面天幕投影模式
function setSkyScreenMode(active) {
  state.skyScreenActive = active;
  skyScreenView.setDirection(els.selectSkyDir.value);
  skyScreenView.setActive(active);

  els.skyScreenOverlay.classList.toggle('hidden', !active);
  els.btnExitSkySide.classList.toggle('hidden', !active);
  els.interactionToolbar.classList.toggle('hidden', active);

  if (active) {
    els.infoScaleBadge.textContent = `L1 天幕投影 (${els.selectSkyDir.options[els.selectSkyDir.selectedIndex].text.split(' ')[0]})`;
    refreshAstronomy();
  } else {
    els.infoScaleBadge.textContent = 'L1 天球儀';
  }
}

// L2 八大行星（含太陽中心全景）快速導覽配置
const SOLAR_PLANETS = [
  { id: 'Sun', nameZh: '太陽', nameEn: 'Sun', symbol: '☀' },
  { id: 'Mercury', nameZh: '水星', nameEn: 'Mercury', symbol: '☿' },
  { id: 'Venus', nameZh: '金星', nameEn: 'Venus', symbol: '♀' },
  { id: 'Earth', nameZh: '地球', nameEn: 'Earth', symbol: '🌍' },
  { id: 'Mars', nameZh: '火星', nameEn: 'Mars', symbol: '♂' },
  { id: 'Jupiter', nameZh: '木星', nameEn: 'Jupiter', symbol: '♃' },
  { id: 'Saturn', nameZh: '土星', nameEn: 'Saturn', symbol: '♄' },
  { id: 'Uranus', nameZh: '天王星', nameEn: 'Uranus', symbol: '♅' },
  { id: 'Neptune', nameZh: '海王星', nameEn: 'Neptune', symbol: '♆' }
];

function updateQuickbarActivePill(id) {
  document.querySelectorAll('.zodiac-pill, .planet-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === id);
  });
}

// 建立 L1 底部黃道十二宮導覽按鈕
function initZodiacQuickbar() {
  if (!els.zodiacPills) return;
  els.zodiacPills.innerHTML = '';
  ZODIAC_CONSTELLATIONS.forEach((sign) => {
    const btn = document.createElement('button');
    btn.className = 'zodiac-pill';
    btn.dataset.id = sign.id;
    btn.textContent = `${sign.symbol} ${sign.nameZh} ${sign.nameEn}`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.zodiac-pill').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      if (state.skyScreenActive) {
        setSkyScreenMode(false);
      }
      if (state.scale !== 'celestial') {
        switchScale('celestial');
      }
      sceneManager.focusZodiacConstellation(sign.id);
    });
    btn.addEventListener('mouseenter', () => {
      sceneManager.hoverConstellation(sign.id);
    });
    btn.addEventListener('mouseleave', () => {
      sceneManager.clearHover();
    });
    els.zodiacPills.appendChild(btn);
  });
}

// 建立 L2 底部八大行星導覽按鈕
function initPlanetQuickbar() {
  if (!els.planetPills) return;
  els.planetPills.innerHTML = '';
  SOLAR_PLANETS.forEach((p) => {
    const btn = document.createElement('button');
    btn.className = p.id === 'Sun' ? 'zodiac-pill planet-pill' : 'planet-pill';
    btn.dataset.id = p.id;
    btn.textContent = `${p.symbol} ${p.nameZh} ${p.nameEn}`;
    if (sceneManager.solarTargetId === p.id) {
      btn.classList.add('active');
    }
    btn.addEventListener('click', () => {
      document.querySelectorAll('.planet-pill').forEach((el) => el.classList.remove('active'));
      btn.classList.add('active');
      els.selectSolarTarget.value = p.id;
      sceneManager.setSolarTarget(p.id);
      const item = sceneManager.solarModel.bodyMap[p.id];
      if (item && item.mesh && item.mesh.userData) {
        renderSelectionInfo(item.mesh.userData);
      }
    });
    btn.addEventListener('mouseenter', () => {
      if (state.scale === 'celestial') {
        sceneManager.hoverBody(p.id);
      }
    });
    btn.addEventListener('mouseleave', () => {
      if (state.scale === 'celestial') {
        sceneManager.clearHover();
      }
    });
    els.planetPills.appendChild(btn);
  });
}

// 將公曆 Date 轉為繁體中文農曆字串（例如：農曆丙午年 九月初八）
const LUNAR_DAYS = [
  '', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

function formatLunarDate(date) {
  try {
    const fmt = new Intl.DateTimeFormat('zh-Hant-TW-u-ca-chinese', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const parts = fmt.formatToParts(date);
    let yearName = '';
    let monthName = '';
    let dayNum = 0;

    for (const p of parts) {
      if (p.type === 'yearName' || p.type === 'year') yearName = p.value;
      if (p.type === 'month') monthName = p.value;
      if (p.type === 'day') dayNum = parseInt(p.value, 10);
    }

    const dayStr = LUNAR_DAYS[dayNum] || `${dayNum}日`;
    return `農曆 ${yearName}年 ${monthName}${dayStr}`;
  } catch {
    return '農曆 --';
  }
}

// 同步 Date 物件至 HTML date / time 輸入框、農曆附註與當日時間滑桿
function syncDateInputsFromState() {
  const d = state.date;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  els.inputDate.value = `${yyyy}-${mm}-${dd}`;
  els.inputTime.value = `${hh}:${min}`;
  if (els.lunarDateNote) {
    els.lunarDateNote.textContent = formatLunarDate(d);
  }

  const totalMinutes = d.getHours() * 60 + d.getMinutes();
  els.sliderDayTime.value = totalMinutes;
  els.sliderTimeLabel.textContent = `${hh}:${min}`;
}

// 從 HTML date / time 輸入框讀取時間
function readDateInputsToState() {
  if (!els.inputDate.value || !els.inputTime.value) return;
  const [yyyy, mm, dd] = els.inputDate.value.split('-').map(Number);
  const [hh, min] = els.inputTime.value.split(':').map(Number);
  state.date = new Date(yyyy, mm - 1, dd, hh, min, 0);
  syncDateInputsFromState();
  refreshAstronomy();
}

// 切換三大觀測尺度 (L1 天球儀 / L2 太陽系 / L3 地平日月)
function switchScale(scaleName) {
  if (state.skyScreenActive) {
    setSkyScreenMode(false);
  }
  state.scale = scaleName;
  els.scaleBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.scale === scaleName);
  });

  els.controlsCelestial.classList.toggle('hidden', scaleName !== 'celestial');
  els.controlsSolar.classList.toggle('hidden', scaleName !== 'solar');
  els.controlsHorizon.classList.toggle('hidden', scaleName !== 'horizon');
  if (els.l1ViewGroup) {
    els.l1ViewGroup.classList.toggle('hidden', scaleName !== 'celestial');
  }
  // L1 隱藏「重置視角」按鈕（已有「天頂軸朝上」與「俯視地平面」專屬視角快捷鈕）；L2/L3 則正常提供「重置視角」
  if (els.btnResetCam) {
    els.btnResetCam.classList.toggle('hidden', scaleName === 'celestial');
  }
  // 底部導覽列切換：L1 顯現黃道十二宮列，L2 顯現八大行星列，L3 均隱藏
  els.zodiacQuickbar.classList.toggle('hidden', scaleName !== 'celestial');
  els.planetQuickbar.classList.toggle('hidden', scaleName !== 'solar');
  if (scaleName === 'solar') {
    updateQuickbarActivePill(sceneManager.solarTargetId || 'Sun');
  }

  const badgeMap = {
    celestial: 'L1 天球儀',
    solar: 'L2 太陽系',
    horizon: 'L3 地平日月'
  };
  els.infoScaleBadge.textContent = badgeMap[scaleName] || scaleName;

  sceneManager.setScale(scaleName);
  refreshAstronomy();
}

// 更新無中鍵滑鼠輔助按鈕狀態
function updateControlModeUI(mode) {
  els.btnModeOrbit.classList.toggle('active', mode === 'orbit');
  els.btnModePan.classList.toggle('active', mode === 'pan');

  if (mode === 'orbit') {
    els.toolbarHint.innerHTML = '已開啟 <b>左鍵 Orbit 旋轉模式</b>：直接拖曳滑鼠左鍵旋轉視角 ｜ 按 <b>Esc</b> 鍵退出';
  } else if (mode === 'pan') {
    els.toolbarHint.innerHTML = '已開啟 <b>左鍵 Pan 平移模式</b>：直接拖曳滑鼠左鍵平移視角 ｜ 按 <b>Esc</b> 鍵退出';
  } else {
    els.toolbarHint.innerHTML = '預設操作：<b>中鍵</b> Orbit 旋轉 ｜ <b>Shift + 中鍵</b> Pan 平移 ｜ <b>滾輪</b> 縮放 ｜ <b>Esc</b> 退出左鍵模式';
  }
}

// 更新左下角選取天體/星座資訊
function renderSelectionInfo(info) {
  if (!info) return;
  const lines = info.details ? info.details.replace(/\n/g, '<br/>') : '';
  const extra = info.extraHtml || '';
  els.selectionDetails.innerHTML = `
    <div class="sel-title">${info.title}</div>
    <div class="sel-sub">${info.subtitle || ''}</div>
    <div class="sel-body">${lines}${extra}</div>
  `;
}

// 計算天文曆表並更新 3D 模型、平面天幕與左下資訊欄
function refreshAstronomy() {
  const eph = computeEphemeris(state.date, state.lat, state.lon);
  sceneManager.updateEphemeris(eph);
  skyScreenView.update(eph);

  // 更新左下資訊欄數值
  const z = eph.sun.zodiac;
  els.infoZodiacSign.textContent = `${z.symbol} ${z.nameZh} (${z.nameEn}) ${z.degInSign.toFixed(1)}°`;
  els.infoZodiacDeg.textContent = `太陽黃經 ${eph.sun.elon.toFixed(2)}° | 赤經 ${formatRA(eph.sun.ra)} | 赤緯 ${eph.sun.dec.toFixed(1)}°`;

  els.infoSunAltAz.textContent = `${eph.sun.altitude.toFixed(1)}° / ${eph.sun.azimuth.toFixed(1)}°`;
  els.infoMoonAltAz.textContent = `${eph.moon.altitude.toFixed(1)}° / ${eph.moon.azimuth.toFixed(1)}°`;
  els.infoMoonPhase.textContent = `${eph.moon.phaseName.split('（')[0]} (${(eph.moon.fraction * 100).toFixed(0)}%)`;
  els.infoLst.textContent = formatRA(eph.lstHours);
}

// 綁定所有 UI 控制事件
function bindUIEvents() {
  // 尺度切換按鈕
  els.scaleBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchScale(btn.dataset.scale));
  });

  // 預設城市選擇與經緯度輸入
  els.presetLocation.addEventListener('change', (e) => {
    if (e.target.value === 'custom') return;
    const [lat, lon] = e.target.value.split(',').map(Number);
    state.lat = lat;
    state.lon = lon;
    els.inputLat.value = lat.toFixed(4);
    els.inputLon.value = lon.toFixed(4);
    refreshAstronomy();
  });

  const onLatLonInput = () => {
    state.lat = Math.max(-90, Math.min(90, parseFloat(els.inputLat.value) || 0));
    state.lon = Math.max(-180, Math.min(180, parseFloat(els.inputLon.value) || 0));
    els.presetLocation.value = 'custom';
    refreshAstronomy();
  };
  els.inputLat.addEventListener('input', onLatLonInput);
  els.inputLon.addEventListener('input', onLatLonInput);

  // 日期與時間事件
  els.inputDate.addEventListener('change', readDateInputsToState);
  els.inputTime.addEventListener('change', readDateInputsToState);

  // 當日時間滑桿即時拖曳 (0 ~ 1439 分鐘)
  els.sliderDayTime.addEventListener('input', (e) => {
    const totalMins = parseInt(e.target.value, 10) || 0;
    const hh = Math.floor(totalMins / 60);
    const min = totalMins % 60;
    state.date.setHours(hh, min, 0, 0);
    syncDateInputsFromState();
    refreshAstronomy();
  });

  els.btnNow.addEventListener('click', () => {
    state.date = new Date();
    syncDateInputsFromState();
    refreshAstronomy();
  });

  els.btnPlay.addEventListener('click', () => {
    state.isPlaying = !state.isPlaying;
    els.btnPlay.classList.toggle('playing', state.isPlaying);
    els.btnPlay.textContent = state.isPlaying ? '⏸ 暫停' : '▶ 播放';
    state.lastFrameTime = performance.now();
  });

  els.selectSpeed.addEventListener('change', (e) => {
    state.speedMultiplier = Number(e.target.value);
  });

  // L1 天幕投影執行與返回天球儀事件
  els.btnExecSky.addEventListener('click', () => {
    setSkyScreenMode(true);
  });
  els.selectSkyDir.addEventListener('change', () => {
    if (state.skyScreenActive) {
      setSkyScreenMode(true);
    }
  });
  els.btnExitSkyMain.addEventListener('click', () => {
    setSkyScreenMode(false);
  });
  els.btnExitSkySide.addEventListener('click', () => {
    setSkyScreenMode(false);
  });

  // L1 天球儀圖層開關
  const bindCheck = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener('change', () => {
      if (key === 'labels') sceneManager.celestialLabelsEnabled = el.checked;
      sceneManager.celestialModel.setLayerVisibility({ [key]: el.checked });
    });
  };
  bindCheck('chk-zodiac', 'zodiac');
  bindCheck('chk-ecliptic', 'ecliptic');
  bindCheck('chk-equator', 'equator');
  bindCheck('chk-other-const', 'otherConst');
  bindCheck('chk-horizon-plane', 'horizonPlane');
  bindCheck('chk-labels', 'labels');

  // L2 太陽系視點切換與圖層
  els.selectSolarTarget.addEventListener('change', (e) => {
    sceneManager.setSolarTarget(e.target.value);
    updateQuickbarActivePill(e.target.value);
  });
  document.getElementById('chk-orbits').addEventListener('change', (e) => {
    sceneManager.solarModel.setOptions({ orbits: e.target.checked });
  });
  document.getElementById('chk-zodiac-backdrop').addEventListener('change', (e) => {
    sceneManager.solarModel.setOptions({ zodiacBackdrop: e.target.checked });
  });

  // L3 地平日月選項
  document.getElementById('chk-day-path').addEventListener('change', (e) => {
    sceneManager.horizonModel.setOptions({ dayPath: e.target.checked });
  });
  document.getElementById('chk-az-grid').addEventListener('change', (e) => {
    sceneManager.horizonModel.setOptions({ azGrid: e.target.checked });
  });
  document.getElementById('chk-shadow').addEventListener('change', (e) => {
    sceneManager.horizonModel.setOptions({ shadow: e.target.checked });
  });

  // 右側頂部：左鍵 Orbit / Pan 輔助模式按鈕 + 重置視角
  els.btnModeOrbit.addEventListener('click', () => {
    sceneManager.controls.setLeftClickMode('orbit');
  });
  els.btnModePan.addEventListener('click', () => {
    sceneManager.controls.setLeftClickMode('pan');
  });
  els.btnResetCam.addEventListener('click', () => {
    sceneManager.resetCameraForCurrentScale();
  });

  // L1 雙重視角快速切換 (頂部操作列 + 左側控制欄同步聯動)
  function setL1ViewMode(mode) {
    sceneManager.setCelestialView(mode, true);
    if (els.btnL1ZenithUp) els.btnL1ZenithUp.classList.toggle('active', mode === 'zenith-up');
    if (els.btnL1HorizonTop) els.btnL1HorizonTop.classList.toggle('active', mode === 'horizon-top');
    if (els.btnSideZenithUp) els.btnSideZenithUp.classList.toggle('active', mode === 'zenith-up');
    if (els.btnSideHorizonTop) els.btnSideHorizonTop.classList.toggle('active', mode === 'horizon-top');
  }

  if (els.btnL1ZenithUp) {
    els.btnL1ZenithUp.addEventListener('click', () => setL1ViewMode('zenith-up'));
  }
  if (els.btnL1HorizonTop) {
    els.btnL1HorizonTop.addEventListener('click', () => setL1ViewMode('horizon-top'));
  }
  if (els.btnSideZenithUp) {
    els.btnSideZenithUp.addEventListener('click', () => setL1ViewMode('zenith-up'));
  }
  if (els.btnSideHorizonTop) {
    els.btnSideHorizonTop.addEventListener('click', () => setL1ViewMode('horizon-top'));
  }
}

// 時間推進動畫迴圈
function tickTime(now) {
  requestAnimationFrame(tickTime);
  if (!state.isPlaying) return;

  const dtSec = (now - state.lastFrameTime) / 1000;
  state.lastFrameTime = now;

  state.date = new Date(state.date.getTime() + dtSec * state.speedMultiplier * 1000);
  syncDateInputsFromState();
  refreshAstronomy();
}

// 自動從 package.json 讀取實際版本號並同步左下角版本標籤
async function syncAppVersionTag() {
  const verEl = document.getElementById('app-version-tag');
  if (!verEl) return;
  try {
    const res = await fetch('./package.json', { cache: 'no-store' });
    if (!res.ok) return;
    const pkg = await res.json();
    if (pkg && pkg.version) {
      const cleanVer = String(pkg.version).replace(/\.0$/, '');
      verEl.textContent = cleanVer.startsWith('v') ? cleanVer : `v${cleanVer}`;
    }
  } catch (_) {
    // 靜態環境若無法讀取則保留 HTML 內建版本標記
  }
}

// 啟動系統
syncAppVersionTag();
initZodiacQuickbar();
initPlanetQuickbar();
syncDateInputsFromState();
bindUIEvents();
refreshAstronomy();
sceneManager.renderLoop();
requestAnimationFrame(tickTime);
