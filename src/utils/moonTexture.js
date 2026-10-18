import * as THREE from 'three';

/**
 * 產生月球真實正面 (Near Side) 與背面 (Far Side) 的高解析度色彩貼圖 (Color Map) 與凹凸高度貼圖 (Bump Map)
 *
 * Three.js SphereGeometry 的等距長方投影 (Equirectangular UV)：
 * - u = 0.0 -> -X，u = 0.25 -> +Z，u = 0.5 -> +X，u = 0.75 -> -Z
 * 我們將月球正面中央 (月面經度 0°, 緯度 0°：中央灣 Sinus Medii) 對齊在 u = 0.25 (+Z 軸方向)
 * 因此當月球 Mesh 呼叫 `moonMesh.lookAt(earthObserverPosition)` 時，
 * 其 +Z 軸（即真實的月球正面：風暴洋、雨海、澄海、靜海、危海、第谷坑等「玉兔」月海特徵）
 * 會永遠精準朝向地球上的觀測者（潮汐鎖定同步自轉）！
 */
let cachedTextures = null;

export function createMoonTextures() {
  if (cachedTextures) return cachedTextures;

  const width = 1024;
  const height = 512;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const cCtx = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d');

  // 1. 基底月表高地 (Lunar Highlands) 色調與中等高度值
  cCtx.fillStyle = '#c8ccd4';
  cCtx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#888888';
  bCtx.fillRect(0, 0, width, height);

  // 將月面經緯度 (lonDeg: -180~+180 東正西負, latDeg: -90~+90 北正南負) 映射到 Canvas (x, y)
  // 令 lon = 0° 對應 u = 0.25 (+Z 正面中心)
  const lonLatToXY = (lonDeg, latDeg) => {
    let u = 0.25 + lonDeg / 360;
    u = ((u % 1) + 1) % 1;
    const v = (90 - latDeg) / 180;
    return { x: u * width, y: v * height };
  };

  // 輔助函式：在經緯度上繪製柔和邊緣的圓形/橢圓區塊（支援跨經度邊界）
  const drawLunarPatch = (ctx, lon, lat, radiusPx, innerColor, outerColor, scaleX = 1.0, scaleY = 1.0) => {
    const { x, y } = lonLatToXY(lon, lat);
    const offsets = [-width, 0, width];
    offsets.forEach((ox) => {
      const cx = x + ox;
      if (cx + radiusPx * 2 < 0 || cx - radiusPx * 2 > width) return;
      ctx.save();
      ctx.translate(cx, y);
      ctx.scale(scaleX, scaleY);
      const grad = ctx.createRadialGradient(0, 0, radiusPx * 0.15, 0, 0, radiusPx);
      grad.addColorStop(0, innerColor);
      grad.addColorStop(0.65, innerColor);
      grad.addColorStop(1, outerColor);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, radiusPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  // 2. 繪製真實月球正面 (Near Side) 著名月海 (Lunar Maria - 暗色玄武岩平原，地勢較低窪)
  // 經緯度皆依據真實月面座標 (Selenographic Coordinates)：
  // 東經 (+lon)：從地球北半球往南看月球時的右側（危海、靜海、澄海、酒海、豐富海）
  // 西經 (-lon)：從地球北半球往南看月球時的左側（雨海、風暴洋、濕海、雲海）
  const mariaList = [
    // 風暴洋 Oceanus Procellarum (正面西側最大月海)
    { lon: -56, lat: 18, r: 95, sx: 0.9, sy: 1.35, dark: 'rgba(82, 88, 100, 0.82)' },
    { lon: -45, lat: 5, r: 75, sx: 1.0, sy: 1.1, dark: 'rgba(86, 92, 104, 0.78)' },
    // 雨海 Mare Imbrium (正面西北部巨大盆地)
    { lon: -16, lat: 33, r: 68, sx: 1.15, sy: 0.95, dark: 'rgba(72, 78, 90, 0.88)' },
    // 冷海 Mare Frigoris (北極圈下方長條狀月海)
    { lon: 0, lat: 56, r: 65, sx: 1.9, sy: 0.42, dark: 'rgba(90, 96, 108, 0.72)' },
    // 澄海 Mare Serenitatis (雨海東側圓形月海)
    { lon: 18, lat: 28, r: 48, sx: 1.05, sy: 0.95, dark: 'rgba(74, 80, 92, 0.86)' },
    // 靜海 Mare Tranquillitatis (澄海東南方，阿波羅11號登陸區)
    { lon: 28, lat: 9, r: 52, sx: 1.15, sy: 0.95, dark: 'rgba(70, 76, 88, 0.86)' },
    // 危海 Mare Crisium (正面東北邊緣獨立橢圓月海)
    { lon: 59, lat: 17, r: 34, sx: 0.95, sy: 1.1, dark: 'rgba(68, 74, 86, 0.9)' },
    // 豐富海 Mare Fecunditatis (靜海東南方)
    { lon: 51, lat: -8, r: 46, sx: 0.9, sy: 1.15, dark: 'rgba(80, 86, 98, 0.8)' },
    // 酒海 Mare Nectaris
    { lon: 35, lat: -15, r: 32, sx: 1.0, sy: 1.0, dark: 'rgba(82, 88, 100, 0.78)' },
    // 雲海 Mare Nubium (正面西南部)
    { lon: -17, lat: -21, r: 48, sx: 1.05, sy: 1.0, dark: 'rgba(84, 90, 102, 0.8)' },
    // 濕海 Mare Humorum (正面西南側圓形月海)
    { lon: -39, lat: -24, r: 32, sx: 1.0, sy: 1.0, dark: 'rgba(76, 82, 94, 0.84)' },
    // 中央灣 Sinus Medii 與汽海 Mare Vaporum
    { lon: 2, lat: 10, r: 28, sx: 1.1, sy: 0.9, dark: 'rgba(86, 92, 104, 0.75)' }
  ];

  mariaList.forEach((m) => {
    // 色彩圖：加深暗灰藍色玄武岩色調
    drawLunarPatch(cCtx, m.lon, m.lat, m.r, m.dark, 'rgba(82, 88, 100, 0)', m.sx, m.sy);
    // 高度凹凸圖：月海盆地較低窪平整
    drawLunarPatch(bCtx, m.lon, m.lat, m.r, 'rgba(95, 95, 95, 0.75)', 'rgba(128, 128, 128, 0)', m.sx, m.sy);
  });

  // 3. 產生固定種子的偽隨機數，繪製全月表數百個大小撞擊坑 (Craters：環形山亮邊與中心凹陷)
  let seed = 19690720;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // 加入幾個真實著名亮坑與輻射紋 (第谷坑 Tycho、哥白尼坑 Copernicus、開普勒坑 Kepler)
  const majorCraters = [
    { lon: -11.3, lat: -43.3, r: 16, rays: true }, // 第谷坑 Tycho (南半球顯著輻射紋)
    { lon: -20.1, lat: 9.6, r: 15, rays: true },   // 哥白尼坑 Copernicus
    { lon: -38.0, lat: 8.1, r: 11, rays: true },   // 開普勒坑 Kepler
    { lon: -47.4, lat: 23.7, r: 10, rays: true },  // 阿里斯塔克坑 Aristarchus (正面最亮斑)
    { lon: -9.3, lat: 51.6, r: 14, rays: false }   // 柏拉圖坑 Plato (暗底坑)
  ];

  // 繪製撞擊坑函式 (同時寫入 Bump 高度圖與 Color 色彩圖)
  const drawCrater = (lon, lat, r, hasRays = false, isBright = false) => {
    const { x, y } = lonLatToXY(lon, lat);
    const offsets = [-width, 0, width];

    offsets.forEach((ox) => {
      const cx = x + ox;
      if (cx + r * 4 < 0 || cx - r * 4 > width) return;

      // 若有輻射紋 (Rays)
      if (hasRays) {
        cCtx.save();
        cCtx.translate(cx, y);
        const rayGrad = cCtx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 3.8);
        rayGrad.addColorStop(0, 'rgba(245, 248, 255, 0.65)');
        rayGrad.addColorStop(0.4, 'rgba(230, 235, 245, 0.25)');
        rayGrad.addColorStop(1, 'rgba(230, 235, 245, 0)');
        cCtx.fillStyle = rayGrad;
        cCtx.beginPath();
        cCtx.arc(0, 0, r * 3.8, 0, Math.PI * 2);
        cCtx.fill();
        cCtx.restore();
      }

      // Bump Map：外圈隆起環形山壁 (亮白色 > 180)，內部深坑凹陷 (深黑色 < 60)，正中央微凸中央峰
      const bGrad = bCtx.createRadialGradient(cx, y, r * 0.08, cx, y, r * 1.25);
      bGrad.addColorStop(0, 'rgba(155, 155, 155, 0.9)');    // 中央峰微凸
      bGrad.addColorStop(0.22, 'rgba(32, 32, 32, 0.92)');   // 坑底深凹
      bGrad.addColorStop(0.68, 'rgba(45, 45, 45, 0.9)');    // 坑壁內側
      bGrad.addColorStop(0.86, 'rgba(245, 245, 245, 0.95)');// 環形山隆起外緣
      bGrad.addColorStop(1.0, 'rgba(128, 128, 128, 0)');
      bCtx.fillStyle = bGrad;
      bCtx.beginPath();
      bCtx.arc(cx, y, r * 1.25, 0, Math.PI * 2);
      bCtx.fill();

      // Color Map：環形山微亮邊緣與坑內微陰影
      const cGrad = cCtx.createRadialGradient(cx, y, r * 0.1, cx, y, r * 1.15);
      if (isBright) {
        cGrad.addColorStop(0, 'rgba(240, 244, 250, 0.55)');
        cGrad.addColorStop(0.75, 'rgba(225, 230, 238, 0.38)');
        cGrad.addColorStop(1, 'rgba(200, 205, 215, 0)');
      } else {
        cGrad.addColorStop(0, 'rgba(105, 110, 120, 0.25)');
        cGrad.addColorStop(0.75, 'rgba(220, 225, 235, 0.32)');
        cGrad.addColorStop(1, 'rgba(180, 185, 195, 0)');
      }
      cCtx.fillStyle = cGrad;
      cCtx.beginPath();
      cCtx.arc(cx, y, r * 1.15, 0, Math.PI * 2);
      cCtx.fill();
    });
  };

  // 先畫隨機分佈的 750 個大小隕石坑，營造豐富月表凹凸肌理
  for (let i = 0; i < 750; i++) {
    const lon = rand() * 360 - 180;
    // 避免極區過度拉伸
    const lat = (rand() * 2 - 1) * 78;
    const sizeRoll = Math.pow(rand(), 3.2);
    const r = 1.8 + sizeRoll * 18;
    drawCrater(lon, lat, r, false, rand() > 0.72);
  }

  // 再畫著名主坑
  majorCraters.forEach((mc) => {
    drawCrater(mc.lon, mc.lat, mc.r, mc.rays, true);
  });

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.ClampToEdgeWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  cachedTextures = { colorMap, bumpMap };
  return cachedTextures;
}
