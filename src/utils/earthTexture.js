import * as THREE from 'three';

/**
 * 產生高解析度藍色地球海洋與陸地貼圖 (Color Map) 與陸地山脈凹凸貼圖 (Bump Map)
 *
 * Three.js SphereGeometry 的等距長方投影 (Equirectangular UV) 座標慣例：
 * 在預設未旋轉的 SphereGeometry 中：
 * - phi = u * 2π，且頂點座標為：
 *   x = -R * cos(phi) * sin(theta)
 *   y =  R * cos(theta)
 *   z =  R * sin(phi) * sin(theta)
 *
 * 為了與本系統的地心慣性/赤道座標轉換公式完全一致：
 *   x(lon, lat) =  R * cos(lat) * cos(lon)
 *   y(lat)      =  R * sin(lat)
 *   z(lon, lat) = -R * cos(lat) * sin(lon)
 *
 * 對比兩式可知：
 *   cos(lon) = -cos(phi)  => phi = π - lon (或 lon + π)
 *   -sin(lon) = sin(phi)  => phi = -lon (mod 2π)
 *   檢查 u = 0.5 (phi = π)：x = +R, z = 0 -> 對應經度 lon = 0° (本初子午線 Greenwich)！
 *   檢查 u = 0.75 (phi = 1.5π)：x = 0, z = -R -> 對應經度 lon = +90°E (東經 90 度)！
 *   檢查 u = 0.25 (phi = 0.5π)：x = 0, z = +R -> 對應經度 lon = -90°W (西經 90 度)！
 *
 * 因此標準等距長方世界地圖 (u = (lon + 180) / 360, v = (90 - lat) / 180)
 * 在 Three.js SphereGeometry 上天然滿足：
 * - 經度 0° (格林威治) 位於 +X 軸
 * - 東經 +90°E 位於 -Z 軸，東經 +121°E (台灣/布柳之家) 位於 (+X, -Z) 象限！
 * - 當地球繞 +Y 軸旋轉 `rotation.y = gstRad` (格林威治恆星時) 時，
 *   台灣 (+121°E) 在地球模型上的法向量就會 100% 對齊當地地方恆星時 (LST = GST + lon) 的天頂向量！
 */
let cachedEarthTextures = null;

export function createEarthTextures() {
  if (cachedEarthTextures) return cachedEarthTextures;

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

  // 1. 繪製深邃漸層藍色海洋基底 (Deep Blue Ocean)
  const oceanGrad = cCtx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0.0, '#0c2d5e');
  oceanGrad.addColorStop(0.2, '#0f3e7d');
  oceanGrad.addColorStop(0.5, '#1554a6');
  oceanGrad.addColorStop(0.8, '#0f3e7d');
  oceanGrad.addColorStop(1.0, '#0c2d5e');
  cCtx.fillStyle = oceanGrad;
  cCtx.fillRect(0, 0, width, height);

  bCtx.fillStyle = '#000000';
  bCtx.fillRect(0, 0, width, height);

  // 經緯度轉畫布像素 (lon: -180~+180, lat: -90~+90)
  const lonLatToXY = (lon, lat) => {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  };

  // 以經緯度多邊形繪製各大洲與主要島嶼
  const drawPolygon = (coords, fillColor, strokeColor = null, bumpColor = '#999999') => {
    if (!coords || coords.length < 3) return;

    // 先畫淺海大陸棚光暈 (Continental Shelf Shallow Water Glow)
    cCtx.save();
    cCtx.beginPath();
    coords.forEach(([lon, lat], idx) => {
      const [x, y] = lonLatToXY(lon, lat);
      if (idx === 0) cCtx.moveTo(x, y);
      else cCtx.lineTo(x, y);
    });
    cCtx.closePath();
    cCtx.lineJoin = 'round';
    cCtx.lineWidth = 5;
    cCtx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    cCtx.stroke();
    cCtx.restore();

    // 畫陸地色彩
    cCtx.save();
    cCtx.beginPath();
    coords.forEach(([lon, lat], idx) => {
      const [x, y] = lonLatToXY(lon, lat);
      if (idx === 0) cCtx.moveTo(x, y);
      else cCtx.lineTo(x, y);
    });
    cCtx.closePath();
    cCtx.fillStyle = fillColor;
    cCtx.fill();
    if (strokeColor) {
      cCtx.lineWidth = 1.2;
      cCtx.strokeStyle = strokeColor;
      cCtx.stroke();
    }
    cCtx.restore();

    // 畫陸地高度 Bump Map
    bCtx.save();
    bCtx.beginPath();
    coords.forEach(([lon, lat], idx) => {
      const [x, y] = lonLatToXY(lon, lat);
      if (idx === 0) bCtx.moveTo(x, y);
      else bCtx.lineTo(x, y);
    });
    bCtx.closePath();
    bCtx.fillStyle = bumpColor;
    bCtx.fill();
    bCtx.restore();
  };

  // 2. 全球各大洲真實經緯度輪廓座標
  // 歐亞大陸 (Eurasia)
  const eurasia = [
    [-9, 36], [-9, 43], [-2, 43], [3, 47], [-5, 48], [2, 51], [8, 54], [10, 58],
    [5, 60], [12, 65], [20, 70], [28, 71], [40, 68], [60, 70], [75, 73], [105, 77],
    [140, 73], [170, 69], [-170, 66], [160, 60], [142, 54], [135, 45], [129, 40],
    [126, 35], [121, 39], [118, 38], [122, 31], [121, 25], [114, 22], [108, 21],
    [109, 13], [103, 2], [100, 13], [96, 16], [90, 22], [80, 8], [77, 8],
    [72, 21], [67, 25], [56, 26], [50, 30], [48, 29], [59, 22], [44, 12],
    [39, 21], [34, 30], [36, 36], [27, 38], [23, 37], [15, 40], [12, 44],
    [8, 44], [3, 42], [-5, 36]
  ];

  // 非洲大陸 (Africa)
  const africa = [
    [-6, 35], [10, 37], [11, 33], [25, 31], [33, 31], [39, 20], [43, 12],
    [51, 12], [45, 2], [40, -10], [35, -24], [27, -33], [18, -35], [15, -25],
    [12, -15], [9, -2], [5, 5], [-8, 5], [-17, 15], [-17, 21], [-13, 28], [-6, 35]
  ];

  // 北美洲 (North America)
  const northAmerica = [
    [-168, 66], [-160, 71], [-135, 70], [-110, 73], [-80, 72], [-65, 62],
    [-53, 47], [-66, 44], [-70, 41], [-76, 35], [-81, 25], [-83, 29],
    [-90, 29], [-97, 26], [-96, 19], [-87, 21], [-83, 10], [-78, 8],
    [-85, 11], [-95, 16], [-105, 20], [-110, 24], [-115, 30], [-122, 37],
    [-124, 48], [-135, 58], [-150, 60], [-162, 55], [-166, 60]
  ];

  // 格陵蘭 (Greenland)
  const greenland = [
    [-55, 60], [-44, 60], [-22, 70], [-18, 80], [-45, 83], [-68, 77], [-58, 68]
  ];

  // 南美洲 (South America)
  const southAmerica = [
    [-78, 9], [-72, 12], [-62, 10], [-50, 2], [-35, -6], [-38, -15],
    [-40, -22], [-48, -28], [-58, -38], [-65, -48], [-68, -55], [-74, -52],
    [-73, -40], [-71, -30], [-70, -18], [-77, -12], [-81, -5], [-78, 4]
  ];

  // 澳洲大陸 (Australia)
  const australia = [
    [114, -22], [122, -17], [131, -12], [136, -12], [136, -16], [142, -11],
    [150, -22], [153, -28], [150, -37], [140, -38], [135, -34], [129, -32],
    [120, -34], [115, -34], [113, -26]
  ];

  // 南極洲 (Antarctica)
  const antarctica = [
    [-180, -72], [-120, -74], [-60, -65], [-30, -72], [0, -70], [45, -68],
    [90, -67], [140, -67], [175, -72], [180, -72], [180, -90], [-180, -90]
  ];

  // 台灣 (Taiwan - 特別精細描繪，讓布柳之家釘選位置清晰可見)
  const taiwan = [
    [120.1, 22.9], [120.8, 21.9], [121.6, 23.9], [121.9, 25.1], [121.0, 24.9], [120.2, 23.6]
  ];

  // 日本列島、英國、馬達加斯加、紐西蘭、印尼群島
  const japan = [
    [130, 31], [136, 34], [140, 36], [141, 41], [145, 44], [140, 43], [138, 37], [131, 34]
  ];
  const uk = [[-5, 50], [1, 51], [-2, 58], [-6, 57]];
  const madagascar = [[44, -25], [49, -12], [50, -16], [47, -25]];
  const newZealand = [[167, -46], [174, -36], [178, -38], [170, -45]];
  const sumatra = [[95, 5], [105, -6], [103, -5], [96, 3]];
  const borneo = [[109, 1], [117, 6], [118, 0], [114, -4]];
  const philippines = [[120, 18], [122, 16], [126, 7], [122, 8], [120, 14]];

  const landGreen = '#2d7a4d';
  const landStroke = '#4ca66b';

  drawPolygon(eurasia, landGreen, landStroke, '#b0b0b0');
  drawPolygon(africa, '#3b8c52', landStroke, '#a0a0a0');
  drawPolygon(northAmerica, landGreen, landStroke, '#a8a8a8');
  drawPolygon(southAmerica, '#277245', landStroke, '#a8a8a8');
  drawPolygon(australia, '#8c6d3b', '#a8864c', '#909090');
  drawPolygon(greenland, '#d8e4f0', '#e2e8f0', '#d0d0d0');
  drawPolygon(antarctica, '#e2e8f0', '#f8fafc', '#e0e0e0');

  drawPolygon(taiwan, '#4ade80', '#86efac', '#ffffff');
  drawPolygon(japan, landGreen, landStroke, '#c0c0c0');
  drawPolygon(uk, landGreen, landStroke, '#b0b0b0');
  drawPolygon(madagascar, '#3b8c52', landStroke, '#b0b0b0');
  drawPolygon(newZealand, landGreen, landStroke, '#b0b0b0');
  drawPolygon(sumatra, landGreen, landStroke, '#b0b0b0');
  drawPolygon(borneo, landGreen, landStroke, '#b0b0b0');
  drawPolygon(philippines, landGreen, landStroke, '#b0b0b0');

  // 3. 為沙漠與高山高原疊加自然地貌色彩 (撒哈拉沙漠、阿拉伯半島、青藏高原、洛磯山脈、安地斯山脈)
  const addBiome = (lon, lat, rPx, color, sx = 1, sy = 1, bumpVal = null) => {
    const [x, y] = lonLatToXY(lon, lat);
    cCtx.save();
    cCtx.translate(x, y);
    cCtx.scale(sx, sy);
    const grad = cCtx.createRadialGradient(0, 0, rPx * 0.1, 0, 0, rPx);
    grad.addColorStop(0, color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    cCtx.fillStyle = grad;
    cCtx.beginPath();
    cCtx.arc(0, 0, rPx, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.restore();

    if (bumpVal) {
      bCtx.save();
      bCtx.translate(x, y);
      bCtx.scale(sx, sy);
      const bGrad = bCtx.createRadialGradient(0, 0, rPx * 0.1, 0, 0, rPx);
      bGrad.addColorStop(0, bumpVal);
      bGrad.addColorStop(1, 'rgba(128,128,128,0)');
      bCtx.fillStyle = bGrad;
      bCtx.beginPath();
      bCtx.arc(0, 0, rPx, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.restore();
    }
  };

  // 撒哈拉與阿拉伯沙漠金黃色調
  addBiome(12, 23, 55, 'rgba(194, 158, 92, 0.65)', 1.5, 0.6);
  addBiome(45, 24, 32, 'rgba(194, 158, 92, 0.6)', 1.0, 0.8);
  // 青藏高原與喜馬拉雅山脈隆起
  addBiome(88, 33, 35, 'rgba(168, 152, 128, 0.65)', 1.3, 0.7, 'rgba(255,255,255,0.95)');
  // 北極冰冠光暈
  const northIce = cCtx.createLinearGradient(0, 0, 0, 32);
  northIce.addColorStop(0, 'rgba(241, 245, 249, 0.9)');
  northIce.addColorStop(1, 'rgba(241, 245, 249, 0)');
  cCtx.fillStyle = northIce;
  cCtx.fillRect(0, 0, width, 32);

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);

  cachedEarthTextures = { colorMap, bumpMap };
  return cachedEarthTextures;
}
