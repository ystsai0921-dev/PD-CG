#!/bin/zsh

# 切換到這個 .command 檔案所在的專案資料夾
cd "$(dirname "$0")"

PORT=5173
URL="http://localhost:${PORT}"

echo "=================================================="
echo "  ✦ Celestial Globe — 多尺度天球儀系統啟動器"
echo "=================================================="

# 檢查 5173 port 是否已經在執行中
if lsof -Pi :${PORT} -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "✅ 偵測到本地伺服器已經在執行中 (${URL})"
  echo "🌐 正在為您開啟瀏覽器..."
  open "${URL}"
  exit 0
fi

# 稍微延遲 1 秒後自動打開預設瀏覽器
(sleep 1 && open "${URL}") &

# 若未來安裝了 Node.js 且已安裝 node_modules，優先使用 Vite；否則使用內建 Python 伺服器
if command -v npm >/dev/null 2>&1 && [ -d "node_modules" ]; then
  echo "🚀 使用 Vite 啟動開發伺服器 (${URL})..."
  echo "💡 關閉此終端機視窗或按 Ctrl+C 即可停止伺服器。"
  npm run dev -- --port ${PORT}
else
  echo "🚀 使用 Python 內建伺服器啟動 (${URL})..."
  echo "💡 關閉此終端機視窗或按 Ctrl+C 即可停止伺服器。"
  python3 -m http.server ${PORT}
fi
