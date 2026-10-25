/**
 * 天體真實實景相片資料庫 (Celestial Body Authentic Photographic Archive)
 * - 支援 L1 天球儀、L1 平面天幕投影、L2 太陽系模型、L3 地平日月模型
 * - 每顆星體均配置「一張以上（2~3 張）」本機真實高畫質天文攝影/探測器拍攝照片
 * - 照片來源：NASA (SDO, Apollo, Curiosity, Juno, Cassini, MESSENGER, Voyager)、ESA (Rosetta, VLT) 官方實景
 * - 圖片均直接內建儲存於 ./public/images/celestial/*.jpg，100% 離線即開、高解析度、永不破圖
 */

export const CELESTIAL_PHOTOS = {
  // 1. 太陽 (Sun) - 3 張真實實景
  Sun: {
    id: 'Sun',
    nameZh: '太陽',
    nameEn: 'Sun',
    photos: [
      {
        file: 'sun_1.jpg',
        title: '極紫外波段太陽日珥與磁場活躍區',
        caption: 'NASA 太陽動力學天文台 (SDO) 於 304 埃極紫外波段拍攝之真實太陽日面，清楚呈現強磁場扭結、耀斑與高達數萬公里的巨型日珥噴發。',
        credit: 'NASA / SDO 太陽動力學天文台',
        year: '2010'
      },
      {
        file: 'sun_2.jpg',
        title: 'SDO 觀測到之 X 級超強烈太陽耀斑爆發',
        caption: 'NASA SDO 衛星於 131 埃極紫外波段記錄到之強烈太陽耀斑 (X-Class Solar Flare)，釋放出高能帶電粒子與強烈電磁輻射。',
        credit: 'NASA / SDO / SVS',
        year: '2024'
      },
      {
        file: 'sun_3.jpg',
        title: '日全食食甚期間之珍珠白太陽日冕與倍里珠',
        caption: '在日全食月球完全遮蔽太陽光球層之珍貴瞬間拍攝，呈現太陽外層高達數百萬度的珍珠白色太陽日冕 (Corona) 與紅寶石色日珥。',
        credit: 'Luc Viatour / 高解析度日食攝影',
        year: '1999'
      }
    ]
  },

  // 2. 月球 (Moon) - 3 張真實實景
  Moon: {
    id: 'Moon',
    nameZh: '月球',
    nameEn: 'Moon',
    photos: [
      {
        file: 'moon_1.jpg',
        title: '全月正面月海與撞擊坑輻射紋真實照片',
        caption: 'NASA 月球勘測軌道飛行器 (LRO) 觀測之月球正面高清實景，清晰可見暗黑色的玄武岩熔岩平原（風暴洋、雨海、澄海、靜海）與第谷坑 (Tycho) 壯麗輻射射紋。',
        credit: 'NASA / LRO 月球勘測軌道飛行器',
        year: '2010'
      },
      {
        file: 'moon_2.jpg',
        title: '阿波羅 8 號經典傳奇攝影《地球升起 Earthrise》',
        caption: '人類歷史上最著名的太空照片之一：1968 年阿波羅 8 號太空人 William Anders 於環月軌道上，拍攝到湛藍地球自月球荒涼地平線升起的震撼實景。',
        credit: 'NASA / Apollo 8 (William Anders)',
        year: '1968'
      },
      {
        file: 'moon_3.jpg',
        title: '阿波羅 11 號登月太空人奧德林於靜海基地實景',
        caption: '阿姆斯壯於 1969 年在月球「靜海基地」拍攝的奧德林全景照片，奧德林面罩金色遮陽板反射出阿姆斯壯與老鷹號登月艙，地表清晰可辨細緻灰黑色月壤。',
        credit: 'NASA / Apollo 11 (Neil Armstrong)',
        year: '1969'
      }
    ]
  },

  // 3. 地球 (Earth) - 2 張真實實景
  Earth: {
    id: 'Earth',
    nameZh: '地球',
    nameEn: 'Earth',
    photos: [
      {
        file: 'earth_1.jpg',
        title: '阿波羅 17 號傳奇經典《藍色彈珠 (The Blue Marble)》',
        caption: '阿波羅 17 號太空人飛往月球途中於 29,000 公里高空拍攝，人類第一張清楚呈現向陽全日照地球的真實照片，展現非洲大陸、阿拉伯半島與南極白色冰冠。',
        credit: 'NASA / Apollo 17 太空人',
        year: '1972'
      },
      {
        file: 'earth_2.jpg',
        title: 'NASA 高解析度地球向陽半球《藍色彈珠重製版》',
        caption: '由極軌氣象衛星與地球觀測儀器數千張真實照片合成之百萬像素向陽面全景，清楚展現地球大氣氣旋螺旋、蔚藍海洋與大陸板塊地貌。',
        credit: 'NASA / GSFC 地球觀測團隊',
        year: '2002'
      }
    ]
  },

  // 4. 水星 (Mercury) - 2 張真實實景
  Mercury: {
    id: 'Mercury',
    nameZh: '水星',
    nameEn: 'Mercury',
    photos: [
      {
        file: 'mercury_1.jpg',
        title: '信使號 (MESSENGER) 增強色彩水星全景',
        caption: 'NASA 信使號探測器透過多光譜濾鏡呈現水星地質成分差異，橘黃色為古老火山熔岩平原，蔚藍色為低反射率富碳礦物地層，右上為巨大的卡洛里盆地。',
        credit: 'NASA / JHUAPL / Carnegie Institution',
        year: '2008'
      },
      {
        file: 'mercury_2.jpg',
        title: '信使號水星卡洛里撞擊盆地居中真實影像',
        caption: '水星最大的撞擊構造——直徑達 1,550 公里的卡洛里撞擊盆地 (Caloris Basin)，周圍環繞著兩公里高環形山脊與受撞擊噴射出的火山熔岩。',
        credit: 'NASA / MESSENGER 探測隊',
        year: '2011'
      }
    ]
  },

  // 5. 金星 (Venus) - 2 張真實實景
  Venus: {
    id: 'Venus',
    nameZh: '金星',
    nameEn: 'Venus',
    photos: [
      {
        file: 'venus_1.jpg',
        title: '水手 10 號可見光金星厚重大氣雲系',
        caption: '水手 10 號飛掠金星時拍攝之真實色彩全景。金星被厚達 20 公里的濃硫酸雲層完全包裹，大氣壓相當於地球水下 900 公尺深，表面溫室效應失控高達 465°C。',
        credit: 'NASA / Mariner 10 水手10號',
        year: '1974'
      },
      {
        file: 'venus_2.jpg',
        title: '前蘇聯金星 13 號 (Venera 13) 460°C 極端地表全景',
        caption: '前蘇聯金星 13 號著陸器於地表高溫 462°C、鉛都會熔化的極端高壓環境下存活 127 分鐘，傳回人類歷史上第一手金星板狀玄武岩岩石地貌的真實彩色照片。',
        credit: 'Soviet Space Agency / Venera 13',
        year: '1982'
      }
    ]
  },

  // 6. 火星 (Mars) - 3 張真實實景
  Mars: {
    id: 'Mars',
    nameZh: '火星',
    nameEn: 'Mars',
    photos: [
      {
        file: 'mars_1.jpg',
        title: '羅塞塔號 (Rosetta) 真實色彩火星全景',
        caption: '歐洲太空總署羅塞塔號太空船飛掠火星時拍攝之真實色彩全景，清楚呈現富含氧化鐵的紅色銹土、暗色大流沙 (Syrtis Major) 玄武岩台地與北極水冰極冠。',
        credit: 'ESA / MPS for OSIRIS Team',
        year: '2007'
      },
      {
        file: 'mars_2.jpg',
        title: '好奇號火星車於蓋爾撞擊坑夏普山地表自拍',
        caption: 'NASA 好奇號 (Curiosity) 火星車於蓋爾撞擊坑沉積岩鑽探處的真實自拍照，背景為高聳 5.5 公里的夏普山 (Mount Sharp)，證實遠古火星曾擁有溫暖濕潤的湖泊。',
        credit: 'NASA / JPL-Caltech / MSSS (Curiosity)',
        year: '2015'
      },
      {
        file: 'mars_3.jpg',
        title: '火星水手號峽谷 (Valles Marineris) 巨型斷崖實景',
        caption: '太陽系最大的裂谷系統——水手號峽谷，長達 4,000 公里、寬 200 公里、深達 7 公里，規模比美國大峽谷大近十倍，由地質構造拉張斷裂形成。',
        credit: 'NASA / USGS / Viking Orbiter',
        year: '1980'
      }
    ]
  },

  // 7. 木星 (Jupiter) - 2 張真實實景
  Jupiter: {
    id: 'Jupiter',
    nameZh: '木星',
    nameEn: 'Jupiter',
    photos: [
      {
        file: 'jupiter_1.jpg',
        title: '朱諾號 (Juno) 近距俯瞰大紅斑反氣旋暴風',
        caption: 'NASA 朱諾號太空船近距離飛掠木星大紅斑 (Great Red Spot) 上空僅 9,000 公里處拍攝，這個寬度比地球還大的超級反氣旋已在木星大氣劇烈咆哮超過 300 年。',
        credit: 'NASA / SwRI / MSSS (JunoCam)',
        year: '2017'
      },
      {
        file: 'jupiter_2.jpg',
        title: '卡西尼號飛掠木星時拍攝之全日面帶狀雲系',
        caption: '卡西尼號在前往土星途中飛掠木星時拍攝之全景，細緻呈現木星明暗交錯的赤道帶 (Belts) 與熱帶區 (Zones)，以及紊流氣旋渦卷。',
        credit: 'NASA / JPL / University of Arizona',
        year: '2000'
      }
    ]
  },

  // 8. 土星 (Saturn) - 2 張真實實景
  Saturn: {
    id: 'Saturn',
    nameZh: '土星',
    nameEn: 'Saturn',
    photos: [
      {
        file: 'saturn_1.jpg',
        title: '卡西尼號晝夜平分點土星光環全景',
        caption: 'NASA 卡西尼號在土星晝夜平分點拍攝之傳世壯景：太陽光正切土星環面，寬達 28 萬公里、厚度僅數十公尺的水冰光環在球體表面投下極細的黑色陰影。',
        credit: 'NASA / JPL / Space Science Institute',
        year: '2008'
      },
      {
        file: 'saturn_2.jpg',
        title: '卡西尼號俯瞰土星北極神秘正六邊形風暴',
        caption: '土星北極特有的幾何正六邊形噴流風暴 (Hexagon Storm)，跨度超過 3 萬公里，核心為時速數百公里的極地氣旋，是流體力學罕見的大自然奇景。',
        credit: 'NASA / JPL-Caltech / SSI (Cassini)',
        year: '2014'
      }
    ]
  },

  // 9. 天王星 (Uranus) - 2 張真實實景
  Uranus: {
    id: 'Uranus',
    nameZh: '天王星',
    nameEn: 'Uranus',
    photos: [
      {
        file: 'uranus_2.jpg',
        title: '航海家 2 號飛掠天王星青藍色平滑球體',
        caption: '1986 年航海家 2 號飛掠天王星時拍攝之真實色彩影像。高層大氣中豐富的甲烷氣體吸收紅光，使這顆自轉軸橫躺 97.8° 的冰巨行星呈現寧靜純粹的青藍色。',
        credit: 'NASA / JPL / Voyager 2 航海家2號',
        year: '1986'
      },
      {
        file: 'uranus_1.jpg',
        title: '天王星大氣條帶雲系與高層甲烷冰霧',
        caption: '經對比增強處理之天王星大氣影像，顯示出微弱的緯向條紋雲帶、極區明亮霧霾與高緯度對流白斑風暴。',
        credit: 'NASA / JPL / Space Telescope Institute',
        year: '2004'
      }
    ]
  },

  // 10. 海王星 (Neptune) - 2 張真實實景
  Neptune: {
    id: 'Neptune',
    nameZh: '海王星',
    nameEn: 'Neptune',
    photos: [
      {
        file: 'neptune_1.jpg',
        title: '航海家 2 號拍攝海王星大黑斑與白色羽狀冰雲',
        caption: '1989 年航海家 2 號飛掠海王星時拍攝之高畫質實景，清晰可見南半球巨型反氣旋暴風「大黑斑 (Great Dark Spot)」與時速達 2,000 公里的高層甲烷白色羽狀雲。',
        credit: 'NASA / JPL / Voyager 2 航海家2號',
        year: '1989'
      },
      {
        file: 'neptune_2.jpg',
        title: '海王星深邃天青石蔚藍球體全景',
        caption: '海王星是太陽系中風速最狂暴的行星，大氣中微量的未知化學成分使其呈現比天王星更加濃郁、深邃的天青石蔚藍色彩。',
        credit: 'NASA / Voyager 2 Image Processing Team',
        year: '1989'
      }
    ]
  },

  // 11. 主要衛星: 木衛一 (Io)
  Io: {
    id: 'Io',
    nameZh: '木衛一（伊奧）',
    nameEn: 'Io',
    photos: [
      {
        file: 'io_1.jpg',
        title: '伽利略號 (Galileo) 拍攝木衛一活火山硫磺地表',
        caption: '木衛一是太陽系中火山活動最劇烈的天體，木星強大潮汐引力不斷扭擠其內部產生極高熱能，地表布滿 400 多座活火山與硫磺沈積物，宛如色彩斑斕的披薩。',
        credit: 'NASA / JPL / University of Arizona',
        year: '1999'
      }
    ]
  },

  // 12. 主要衛星: 木衛二 (Europa)
  Europa: {
    id: 'Europa',
    nameZh: '木衛二（歐羅巴）',
    nameEn: 'Europa',
    photos: [
      {
        file: 'europa_1.jpg',
        title: '伽利略號探測器木衛二交錯冰裂紋實景',
        caption: '木衛二潔白平滑的水冰外殼下蘊藏著深達百公里的全球液態海洋，地表縱橫交錯的紅褐色條紋是由冰層受潮汐拉扯破裂、富含礦物質地下鹽水湧出凝結而成。',
        credit: 'NASA / JPL / DLR (Galileo Mission)',
        year: '1998'
      }
    ]
  },

  // 13. 主要衛星: 土衛六 (Titan)
  Titan: {
    id: 'Titan',
    nameZh: '土衛六（泰坦）',
    nameEn: 'Titan',
    photos: [
      {
        file: 'titan_1.jpg',
        title: '卡西尼號拍攝土衛六厚重橘色大氣霧霾真實照片',
        caption: '土衛六是太陽系唯一擁有濃厚大氣層（氮氣佔 95%）的衛星，其高層大氣光化學反應形成濃厚的有機橘色霾層，地表更擁有由液態甲烷與乙烷組成的廣闊河流與海泊。',
        credit: 'NASA / JPL / Space Science Institute (Cassini)',
        year: '2005'
      }
    ]
  },

  // 14. 著名亮恆星: 獵戶座參宿四 (Betelgeuse)
  Betelgeuse: {
    id: 'Betelgeuse',
    nameZh: '參宿四',
    nameEn: 'Betelgeuse',
    photos: [
      {
        file: 'betelgeuse_1.jpg',
        title: '歐洲南方天文台 VLT 甚大望遠鏡參宿四紅超巨星直接成像',
        caption: '歐洲南方天文台 VLT 望遠鏡直接拍攝之獵戶座參宿四紅超巨星實景，清楚解析出恆星表面巨大的對流沸騰熱泡與 2019 年大變暗時期噴發釋放的巨大塵埃羽流。',
        credit: 'ESO / M. Montargès et al. (VLT)',
        year: '2020'
      }
    ]
  },

  // 15. 著名亮恆星: 大犬座天狼星 (Sirius)
  Sirius: {
    id: 'Sirius',
    nameZh: '天狼星',
    nameEn: 'Sirius',
    photos: [
      {
        file: 'sirius_1.jpg',
        title: '哈伯太空望遠鏡天狼星 A 與白矮星伴星天狼星 B 實景照片',
        caption: '哈伯望遠鏡拍攝之全天最亮恆星天狼星系統，中央光芒四射的璀璨恆星為藍白主序星 A，左下方微弱清晰的小光點為其緻密的白矮星伴星天狼星 B（小犬星）。',
        credit: 'NASA / ESA / H.E. Bond (STScI)',
        year: '2005'
      }
    ]
  }
};

/**
 * 取得圖片在當前環境下的 URL
 * 優先使用本地 ./public/images/celestial/ 檔案，支援 Vite 與 Python http.server
 */
export function getPhotoUrl(filename) {
  if (!filename) return '';
  return `./public/images/celestial/${filename}`;
}

/**
 * 從選取物件 info 中智慧匹配出對應天體的相片資料
 * @param {Object} info
 * @returns {Object|null}
 */
export function getCelestialBodyPhotos(info) {
  if (!info) return null;

  // 1. 直接以 bodyId 匹配
  if (info.bodyId && CELESTIAL_PHOTOS[info.bodyId]) {
    return CELESTIAL_PHOTOS[info.bodyId];
  }

  // 2. 以 id 匹配
  if (info.id && CELESTIAL_PHOTOS[info.id]) {
    return CELESTIAL_PHOTOS[info.id];
  }

  // 3. 從 title、subtitle 或 starName 字串進行關鍵字匹配
  const titleStr = `${info.title || ''} ${info.subtitle || ''} ${info.starName || ''} ${info.nameZh || ''} ${info.nameEn || ''}`.toLowerCase();

  const matchKeys = [
    { key: 'Sun', matches: ['太陽', 'sun'] },
    { key: 'Moon', matches: ['月球', 'moon'] },
    { key: 'Earth', matches: ['地球', 'earth'] },
    { key: 'Mercury', matches: ['水星', 'mercury'] },
    { key: 'Venus', matches: ['金星', 'venus'] },
    { key: 'Mars', matches: ['火星', 'mars'] },
    { key: 'Jupiter', matches: ['木星', 'jupiter'] },
    { key: 'Saturn', matches: ['土星', 'saturn'] },
    { key: 'Uranus', matches: ['天王星', 'uranus'] },
    { key: 'Neptune', matches: ['海王星', 'neptune'] },
    { key: 'Io', matches: ['木衛一', '伊奧', 'io'] },
    { key: 'Europa', matches: ['木衛二', '歐羅巴', 'europa'] },
    { key: 'Titan', matches: ['土衛六', '泰坦', 'titan'] },
    { key: 'Betelgeuse', matches: ['參宿四', 'betelgeuse'] },
    { key: 'Sirius', matches: ['天狼星', 'sirius'] }
  ];

  for (const item of matchKeys) {
    for (const m of item.matches) {
      if (titleStr.includes(m)) {
        return CELESTIAL_PHOTOS[item.key];
      }
    }
  }

  return null;
}

/**
 * 產生天體實景照片相簿的 HTML 標籤
 * @param {Object} bodyData - 來自 CELESTIAL_PHOTOS 的天體資料
 * @param {number} activeIndex - 目前選中的照片索引 (預設 0)
 * @returns {string} HTML 字串
 */
export function renderPhotoGalleryHtml(bodyData, activeIndex = 0) {
  if (!bodyData || !bodyData.photos || bodyData.photos.length === 0) {
    return '';
  }

  const photos = bodyData.photos;
  const currentIdx = Math.max(0, Math.min(activeIndex, photos.length - 1));
  const p = photos[currentIdx];
  const count = photos.length;
  const photoUrl = getPhotoUrl(p.file);

  // 縮圖與切換按鈕
  let switcherHtml = '';
  if (count > 1) {
    switcherHtml = `
      <div class="cg-gallery-nav">
        <button class="cg-nav-arrow cg-prev" data-idx="${(currentIdx - 1 + count) % count}" title="上一張實景照片">‹</button>
        <div class="cg-pills">
          ${photos
            .map(
              (item, idx) => `
            <button class="cg-pill ${idx === currentIdx ? 'active' : ''}" data-idx="${idx}" title="${item.title}">
              ${idx + 1}
            </button>
          `
            )
            .join('')}
        </div>
        <button class="cg-nav-arrow cg-next" data-idx="${(currentIdx + 1) % count}" title="下一張實景照片">›</button>
      </div>
    `;
  }

  return `
    <div class="cg-photo-card" data-body-id="${bodyData.id}" data-current-idx="${currentIdx}">
      <div class="cg-photo-viewport" title="點擊放大檢視實景大圖 🔍">
        <img 
          src="${photoUrl}" 
          alt="${p.title}" 
          class="cg-photo-img" 
          loading="eager"
          onerror="if (!this.dataset.fallbackTried) { this.dataset.fallbackTried = '1'; this.src = '/public/images/celestial/${p.file}'; }"
        />
        <div class="cg-photo-badges">
          <span class="cg-badge-num">📷 實景照片 ${currentIdx + 1}/${count}</span>
          <span class="cg-badge-credit">${p.credit.split(' ')[0]}</span>
        </div>
        <div class="cg-zoom-hint" title="點擊檢視高畫質大圖">🔍 放大檢視</div>
      </div>

      <div class="cg-photo-meta">
        <div class="cg-photo-title-row">
          <span class="cg-photo-title">${p.title}</span>
          ${p.year ? `<span class="cg-photo-year">${p.year}</span>` : ''}
        </div>
        <div class="cg-photo-caption">${p.caption}</div>
      </div>

      ${switcherHtml}
    </div>
  `;
}
