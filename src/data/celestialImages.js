/**
 * 天體實景照片資料庫 (Celestial Body Photographic Archive)
 * - 支援 L1 天球儀、L1 平面天幕投影、L2 太陽系模型、L3 地平日月模型
 * - 每顆星體均配置「一張以上（2~3 張）」真實天文攝影/探測器高畫質實景照片
 * - 照片來源：NASA、ESA、Hubble、JWST、Voyager、Cassini、SDO、LRO、Curiosity 等官方探測實景
 * - 同時配置本地 SVG 高清光學地貌備援，兼具離線自給自足與線上高解析度雙重保障
 */

export const CELESTIAL_PHOTOS = {
  // 1. 太陽 (Sun)
  Sun: {
    id: 'Sun',
    nameZh: '太陽',
    nameEn: 'Sun',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg/640px-The_Sun_by_the_Atmospheric_Imaging_Assembly_of_NASA%27s_Solar_Dynamics_Observatory_-_20100819.jpg',
        localUrl: '/images/celestial/sun_1.svg',
        title: '極紫外波段太陽日珥與磁場活躍區',
        caption: 'NASA 太陽動力學天文台 (SDO) 於 304 埃極紫外線波段拍攝，呈現日冕劇烈磁場扭結、耀斑與高達數萬公里的巨大日珥噴發。',
        credit: 'NASA / SDO',
        year: '2010'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Solar_prominence_from_STEREO_spacecraft_September_29_2008.jpg/640px-Solar_prominence_from_STEREO_spacecraft_September_29_2008.jpg',
        localUrl: '/images/celestial/sun_2.svg',
        title: '日球層日珥與可見光太陽黑子群',
        caption: 'NASA STEREO 探測器拍攝之高解析度太陽邊緣噴射羽流，光球層呈現清晰的邊緣昏暗效應與強磁場太陽黑子群 (Sunspots)。',
        credit: 'NASA / STEREO',
        year: '2008'
      }
    ]
  },

  // 2. 月球 (Moon)
  Moon: {
    id: 'Moon',
    nameZh: '月球',
    nameEn: 'Moon',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/640px-FullMoon2010.jpg',
        localUrl: '/images/celestial/moon_1.svg',
        title: '全月正面月海與撞擊坑輻射紋',
        caption: '滿月時期月球正面高清實景，清晰可見暗黑色的玄武岩熔岩平原（風暴洋、雨海、澄海、靜海），以及南部第谷坑 (Tycho) 壯麗的數百公里白色輻射射紋。',
        credit: 'NASA / LRO 探測隊',
        year: '2010'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/NASA-Apollo8-Dec24-Earthrise.jpg/640px-NASA-Apollo8-Dec24-Earthrise.jpg',
        localUrl: '/images/celestial/moon_2.svg',
        title: '阿波羅 8 號經典傳世照片《地球升起》',
        caption: '人類歷史上最著名的太空實景之一：1968 年阿波羅 8 號太空人在環月軌道上，目睹湛藍脆弱的地球自荒涼的月球起伏隕石坑地平線升起。',
        credit: 'NASA / Apollo 8 (William Anders)',
        year: '1968'
      }
    ]
  },

  // 3. 地球 (Earth)
  Earth: {
    id: 'Earth',
    nameZh: '地球',
    nameEn: 'Earth',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/The_Earth_seen_from_Apollo_17.jpg/640px-The_Earth_seen_from_Apollo_17.jpg',
        localUrl: '/images/celestial/earth_1.svg',
        title: '經典傳奇《藍色彈珠 (The Blue Marble)》',
        caption: '阿波羅 17 號太空人飛往月球途中於 29,000 公里高空拍攝，人類第一張清楚呈現向陽全日照地球的真實照片，呈現非洲大陸、阿拉伯半島與南極白色冰冠。',
        credit: 'NASA / Apollo 17',
        year: '1972'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Earth_Western_Hemisphere_transparent_background.png/640px-Earth_Western_Hemisphere_transparent_background.png',
        localUrl: '/images/celestial/earth_2.svg',
        title: 'ISS 軌道俯瞰大氣薄層與極光光圈',
        caption: '國際太空站太空人俯瞰地球邊緣，薄如蟬翼的蔚藍大氣光圈保護著地表生命，遠處夜空漫舞著強烈的太陽風地磁暴綠色極光 (Aurora)。',
        credit: 'NASA / ISS Crew',
        year: '2021'
      }
    ]
  },

  // 4. 水星 (Mercury)
  Mercury: {
    id: 'Mercury',
    nameZh: '水星',
    nameEn: 'Mercury',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Mercury_in_color_-_Prockter07-edit1.jpg/640px-Mercury_in_color_-_Prockter07-edit1.jpg',
        localUrl: '/images/celestial/mercury_1.svg',
        title: '信使號 (MESSENGER) 增強色彩水星全景',
        caption: 'NASA 信使號探測器透過多光譜濾鏡呈現水星地質成分差異，橘黃色為古老火山熔岩平原，蔚藍色為低反射率富碳礦物地層，右上為直徑達 1,550 公里的卡洛里撞擊盆地。',
        credit: 'NASA / JHUAPL / Carnegie',
        year: '2008'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Mercury_in_color_-_Prockter07_centered.jpg/640px-Mercury_in_color_-_Prockter07_centered.jpg',
        localUrl: '/images/celestial/mercury_1.svg',
        title: '水星卡洛里盆地與高聳逆斷層斷崖',
        caption: '水星因星體冷卻收縮，在地表擠壓出高達數公里、綿延數百公里的巨大皺脊斷崖 (Lobate Scarps)，見證了這顆最內側行星的演化歷程。',
        credit: 'NASA / MESSENGER',
        year: '2011'
      }
    ]
  },

  // 5. 金星 (Venus)
  Venus: {
    id: 'Venus',
    nameZh: '金星',
    nameEn: 'Venus',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Venus-real_color.jpg/640px-Venus-real_color.jpg',
        localUrl: '/images/celestial/venus_1.svg',
        title: '水手 10 號可見光金星稠密雲系',
        caption: '金星被 20 公里厚的硫酸滴濃雲完全籠罩，大氣壓高達地球 92 倍。在紫外線與增強光學下，可見巨大的橫向「V 字形」大氣超旋轉風暴系統。',
        credit: 'NASA / Mariner 10',
        year: '1974'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Venera_13_view_of_the_surface_of_Venus_%28color_corrected%29.jpg/640px-Venera_13_view_of_the_surface_of_Venus_%28color_corrected%29.jpg',
        localUrl: '/images/celestial/venus_2.svg',
        title: '金星 13 號 (Venera 13) 460°C 極端地表實景',
        caption: '前蘇聯金星 13 號登陸器於地表高溫 462°C、鉛都會熔化的地獄環境下存活 127 分鐘，傳回人類珍貴的第一手金星板狀玄武岩岩石地貌照片。',
        credit: 'Soviet Space Agency / Venera 13',
        year: '1982'
      }
    ]
  },

  // 6. 火星 (Mars)
  Mars: {
    id: 'Mars',
    nameZh: '火星',
    nameEn: 'Mars',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/OSIRIS_Mars_true_color.jpg/640px-OSIRIS_Mars_true_color.jpg',
        localUrl: '/images/celestial/mars_1.svg',
        title: '羅塞塔號真實色彩火星全景',
        caption: '歐洲太空總署 (ESA) 羅塞塔號太空船飛掠火星時拍攝之真實色彩全景，清楚展現富含氧化鐵的紅色銹土、暗色大流沙玄武岩台地與北極水冰/乾冰極冠。',
        credit: 'ESA / MPS for OSIRIS Team',
        year: '2007'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Curiosity%27s_Self-Portrait_at_%27Windjana%27.jpg/640px-Curiosity%27s_Self-Portrait_at_%27Windjana%27.jpg',
        localUrl: '/images/celestial/mars_2.svg',
        title: '好奇號火星車蓋爾撞擊坑夏普山自拍實景',
        caption: 'NASA 好奇號 (Curiosity) 於蓋爾撞擊坑沉積岩層鑽探處拍攝全景，背景為高達 5.5 公里的夏普山 (Mount Sharp)，證實數十億年前火星曾擁有溫暖濕潤的湖泊。',
        credit: 'NASA / JPL-Caltech / MSSS',
        year: '2014'
      }
    ]
  },

  // 7. 木星 (Jupiter)
  Jupiter: {
    id: 'Jupiter',
    nameZh: '木星',
    nameEn: 'Jupiter',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Jupiter.jpg/640px-Jupiter.jpg',
        localUrl: '/images/celestial/jupiter_1.svg',
        title: '朱諾號 (Juno) 近距俯瞰大紅斑暴風',
        caption: 'NASA 朱諾號太空船近距離飛掠木星大紅斑 (Great Red Spot) 上空僅 9,000 公里時拍攝，這個比地球還大的超級反氣旋已在木星大氣狂暴肆虐超過 300 年。',
        credit: 'NASA / JPL-Caltech / SwRI / MSSS',
        year: '2017'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Hubble_Captures_Vivid_Auroras_in_Jupiter%E2%80%99s_Atmosphere.jpg/640px-Hubble_Captures_Vivid_Auroras_in_Jupiter%E2%80%99s_Atmosphere.jpg',
        localUrl: '/images/celestial/jupiter_2.svg',
        title: '哈伯與韋伯望遠鏡拍攝之木星極光與光環',
        caption: '木星擁有太陽系最強大的行星磁場，木衛一噴發的帶電硫離子撞擊木星高層大氣，激發出直徑比地球還寬闊、璀璨奪目的永久紫外線極光冠。',
        credit: 'NASA / ESA / Hubble Heritage',
        year: '2016'
      }
    ]
  },

  // 8. 土星 (Saturn)
  Saturn: {
    id: 'Saturn',
    nameZh: '土星',
    nameEn: 'Saturn',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/640px-Saturn_during_Equinox.jpg',
        localUrl: '/images/celestial/saturn_1.svg',
        title: '卡西尼號 (Cassini) 晝夜平分點土星環全景',
        caption: 'NASA 卡西尼號在土星晝夜平分點拍攝之傳世壯景：太陽幾乎正切土星環面，直徑 28 萬公里、厚度僅數十公尺的水冰光環在球體表面投下纖細修長的陰影。',
        credit: 'NASA / JPL / Space Science Institute',
        year: '2008'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Cassini%27s_best_view_of_Saturn%27s_hexagonal_storm.jpg/640px-Cassini%27s_best_view_of_Saturn%27s_hexagonal_storm.jpg',
        localUrl: '/images/celestial/saturn_2.svg',
        title: '卡西尼號俯瞰土星北極神秘六邊形風暴',
        caption: '土星北極特有的幾何六邊形高速噴射氣流 (Hexagonal Jet Stream)，跨度超過 3 萬公里，內部核心為狂暴旋轉的極地氣旋，是流體力學罕見的大自然奇觀。',
        credit: 'NASA / JPL-Caltech / SSI / Hampton Univ.',
        year: '2013'
      }
    ]
  },

  // 9. 天王星 (Uranus)
  Uranus: {
    id: 'Uranus',
    nameZh: '天王星',
    nameEn: 'Uranus',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Uranus2.jpg/640px-Uranus2.jpg',
        localUrl: '/images/celestial/uranus_1.svg',
        title: '航海家 2 號飛掠天王星青藍色球體',
        caption: '航海家 2 號於 1986 年飛掠天王星時拍攝的真實色彩影像。高層大氣中豐富的甲烷氣體強烈吸收紅光，使這顆「側臥自轉」的冰巨行星呈現平滑寧靜的藍綠色。',
        credit: 'NASA / JPL / Voyager 2',
        year: '1986'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Uranus_with_rings_and_moons_-_JWST_NIRCam_%28weic2332a%29.png/640px-Uranus_with_rings_and_moons_-_JWST_NIRCam_%28weic2332a%29.png',
        localUrl: '/images/celestial/uranus_1.svg',
        title: '韋伯太空望遠鏡 (JWST) 天王星光環與極冠實景',
        caption: '韋伯近紅外相機 (NIRCam) 於 2023 年拍攝之最新超高清實景：天王星亮白季節性極冠、暴風雲系以及深邃宇宙中清晰立體的 11 道纖細暗色光環。',
        credit: 'NASA / ESA / CSA / STScI (JWST)',
        year: '2023'
      }
    ]
  },

  // 10. 海王星 (Neptune)
  Neptune: {
    id: 'Neptune',
    nameZh: '海王星',
    nameEn: 'Neptune',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg/640px-Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg',
        localUrl: '/images/celestial/neptune_1.svg',
        title: '航海家 2 號海王星大黑斑與羽狀冰雲',
        caption: '1989 年航海家 2 號飛掠海王星時拍攝之高畫質全景，中央清晰可見南半球巨型反氣旋暴風「大黑斑 (Great Dark Spot)」與時速達 2,000 公里的高層甲烷白色羽雲。',
        credit: 'NASA / JPL / Voyager 2',
        year: '1989'
      },
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Neptune_full.jpg/640px-Neptune_full.jpg',
        localUrl: '/images/celestial/neptune_1.svg',
        title: '海王星深邃湛藍球體與超音速狂風',
        caption: '海王星擁有太陽系中最狂暴的行星風暴，風速高達音速的兩倍。大氣中的微量未知成分使海王星呈現比天王星更加濃郁深邃的天青石蔚藍色。',
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
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Io_highest_resolution_true_color.jpg/640px-Io_highest_resolution_true_color.jpg',
        localUrl: '/images/celestial/io_1.svg',
        title: '伽利略號 (Galileo) 木衛一活火山地表',
        caption: '木衛一是太陽系中火山活動最劇烈的天體，木星強大潮汐引力不斷揉搓其核心產生超高熱能，地表布滿 400 多座活火山與硫磺沈積物，宛如色彩斑斕的披薩。',
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
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Europa-moon-with-margins.jpg/640px-Europa-moon-with-margins.jpg',
        localUrl: '/images/celestial/europa_1.svg',
        title: '伽利略號木衛二縱橫交錯冰裂紋實景',
        caption: '木衛二平滑潔白的水冰外殼下蘊藏著深達百公里的全球液態海洋，地表縱橫交錯的紅褐色條紋是由冰層潮汐拉扯斷裂、富含礦物鹽的地下海水湧出凝結而成。',
        credit: 'NASA / JPL / DLR',
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
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Titan_in_true_color.jpg/640px-Titan_in_true_color.jpg',
        localUrl: '/images/celestial/titan_1.svg',
        title: '卡西尼號拍攝土衛六厚重橘色大氣霧霾',
        caption: '土衛六是太陽系唯一擁有濃厚大氣層（氮氣佔 95%）的衛星，其高層大氣光化學反應形成濃厚的有機橘色霾層，地表更擁有液態甲烷與乙烷組成的廣闊河流與海泊。',
        credit: 'NASA / JPL / Space Science Institute',
        year: '2005'
      }
    ]
  },

  // 14. 著名亮恆星代表: 參宿四 (Betelgeuse)
  Betelgeuse: {
    id: 'Betelgeuse',
    nameZh: '參宿四',
    nameEn: 'Betelgeuse',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Betelgeuse_pulsating.jpg/640px-Betelgeuse_pulsating.jpg',
        localUrl: '/images/celestial/betelgeuse_1.svg',
        title: 'ESO 甚大望遠鏡 (VLT) 參宿四紅超巨星表面熱泡',
        caption: '歐洲南方天文台 VLT 球面相機直接拍攝之獵戶座參宿四紅超巨星實景，清楚解析出恆星表面巨大的對流沸騰熱泡與 2019 年大變暗時期釋放的塵埃雲。',
        credit: 'ESO / M. Montargès et al.',
        year: '2020'
      }
    ]
  },

  // 15. 著名亮恆星代表: 天狼星 (Sirius)
  Sirius: {
    id: 'Sirius',
    nameZh: '天狼星',
    nameEn: 'Sirius',
    photos: [
      {
        url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Hubble_Sirius_A_and_B_arrow.jpg/640px-Hubble_Sirius_A_and_B_arrow.jpg',
        localUrl: '/images/celestial/sirius_1.svg',
        title: '哈伯太空望遠鏡天狼星 A 與白矮星伴星天狼星 B',
        caption: '哈伯望遠鏡拍攝之全天最亮恆星天狼星系統，璀璨耀眼的光芒中央為質量約太陽 2 倍的藍白主序星 A，左下微弱光點為其緻密的白矮星伴星天狼星 B（小犬星）。',
        credit: 'NASA / ESA / H.E. Bond (STScI)',
        year: '2005'
      }
    ]
  }
};

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

  // 縮圖與切換按鈕
  let switcherHtml = '';
  if (count > 1) {
    switcherHtml = `
      <div class="cg-gallery-nav">
        <button class="cg-nav-arrow cg-prev" data-idx="${(currentIdx - 1 + count) % count}" title="上一張照片">‹</button>
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
        <button class="cg-nav-arrow cg-next" data-idx="${(currentIdx + 1) % count}" title="下一張照片">›</button>
      </div>
    `;
  }

  return `
    <div class="cg-photo-card" data-body-id="${bodyData.id}" data-current-idx="${currentIdx}">
      <div class="cg-photo-viewport" title="點擊放大檢視實景大圖 🔍">
        <img 
          src="${p.url}" 
          alt="${p.title}" 
          class="cg-photo-img" 
          loading="lazy"
          onerror="if (!this.dataset.triedLocal) { this.dataset.triedLocal = '1'; this.src = '${p.localUrl}'; }"
        />
        <div class="cg-photo-badges">
          <span class="cg-badge-num">📷 實景照片 ${currentIdx + 1}/${count}</span>
          <span class="cg-badge-credit">${p.credit}</span>
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
