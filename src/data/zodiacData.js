/**
 * 黃道十二宮 (Zodiac 12 Constellations) 與重要代表星座資料
 * 所有名稱皆採用「繁體中文（附英文對照）」格式
 * 座標單位：赤經 RA (小時 0~24h)，赤緯 Dec (度 -90°~+90°)
 */

export const ZODIAC_CONSTELLATIONS = [
  {
    id: 'Aries',
    symbol: '♈',
    nameZh: '牡羊座',
    nameEn: 'Aries',
    eclipticStart: 0,
    desc: '黃道第一宮（春分點起始宮位），主星為婁宿三 (Hamal)。',
    stars: [
      { name: '婁宿三 Hamal (α Ari)', ra: 2.12, dec: 23.46, mag: 2.0 },
      { name: '婁宿一 Sheratan (β Ari)', ra: 1.91, dec: 20.81, mag: 2.6 },
      { name: '婁宿二 Mesarthim (γ Ari)', ra: 1.89, dec: 19.29, mag: 3.9 },
      { name: '胃宿三 41 Ari (c Ari)', ra: 2.83, dec: 27.26, mag: 3.6 }
    ],
    lines: [[3, 0], [0, 1], [1, 2]]
  },
  {
    id: 'Taurus',
    symbol: '♉',
    nameZh: '金牛座',
    nameEn: 'Taurus',
    eclipticStart: 30,
    desc: '黃道第二宮，擁有橘紅巨星畢宿五 (Aldebaran) 與著名的昴宿星團。',
    stars: [
      { name: '畢宿五 Aldebaran (α Tau)', ra: 4.60, dec: 16.51, mag: 0.85 },
      { name: '五車五 Elnath (β Tau)', ra: 5.44, dec: 28.61, mag: 1.65 },
      { name: '天關 Zeta Tau (ζ Tau)', ra: 5.63, dec: 21.14, mag: 3.0 },
      { name: '畢宿一 Ain (ε Tau)', ra: 4.48, dec: 19.18, mag: 3.5 },
      { name: '畢宿四 Gamma Tau (γ Tau)', ra: 4.33, dec: 15.63, mag: 3.6 },
      { name: '昴宿六 Alcyone (η Tau)', ra: 3.79, dec: 24.11, mag: 2.87 }
    ],
    lines: [[2, 0], [0, 4], [4, 3], [3, 1], [4, 5]]
  },
  {
    id: 'Gemini',
    symbol: '♊',
    nameZh: '雙子座',
    nameEn: 'Gemini',
    eclipticStart: 60,
    desc: '黃道第三宮（夏至點所在區域），以北河二 (Castor) 與北河三 (Pollux) 雙星聞名。',
    stars: [
      { name: '北河三 Pollux (β Gem)', ra: 7.76, dec: 28.03, mag: 1.14 },
      { name: '北河二 Castor (α Gem)', ra: 7.58, dec: 31.89, mag: 1.58 },
      { name: '井宿三 Alhena (γ Gem)', ra: 6.63, dec: 16.40, mag: 1.93 },
      { name: '井宿一 Tejat (μ Gem)', ra: 6.38, dec: 22.51, mag: 2.87 },
      { name: '井宿五 Mebsuta (ε Gem)', ra: 6.73, dec: 25.13, mag: 3.06 },
      { name: '天樽二 Wasat (δ Gem)', ra: 7.34, dec: 21.98, mag: 3.53 }
    ],
    lines: [[1, 0], [1, 4], [4, 3], [0, 5], [5, 2]]
  },
  {
    id: 'Cancer',
    symbol: '♋',
    nameZh: '巨蟹座',
    nameEn: 'Cancer',
    eclipticStart: 90,
    desc: '黃道第四宮，中央包含著名的鬼宿星團（蜂巢星團 Praesepe）。',
    stars: [
      { name: '柳宿增十 Al Tarf (β Cnc)', ra: 8.28, dec: 9.19, mag: 3.5 },
      { name: '鬼宿四 Asellus Australis (δ Cnc)', ra: 8.74, dec: 18.15, mag: 3.9 },
      { name: '鬼宿三 Asellus Borealis (γ Cnc)', ra: 8.72, dec: 21.47, mag: 4.7 },
      { name: '鬼宿一 Iota Cnc (ι Cnc)', ra: 8.78, dec: 28.76, mag: 4.0 },
      { name: '柳宿增三 Acubens (α Cnc)', ra: 8.98, dec: 11.86, mag: 4.25 }
    ],
    lines: [[0, 1], [4, 1], [1, 2], [2, 3]]
  },
  {
    id: 'Leo',
    symbol: '♌',
    nameZh: '獅子座',
    nameEn: 'Leo',
    eclipticStart: 120,
    desc: '黃道第五宮，主星軒轅十四 (Regulus) 幾乎正好位於黃道線上。',
    stars: [
      { name: '軒轅十四 Regulus (α Leo)', ra: 10.14, dec: 11.97, mag: 1.35 },
      { name: '五帝座一 Denebola (β Leo)', ra: 11.82, dec: 14.57, mag: 2.14 },
      { name: '軒轅十二 Algieba (γ Leo)', ra: 10.33, dec: 19.84, mag: 2.08 },
      { name: '太微右垣五 Zosma (δ Leo)', ra: 11.24, dec: 20.52, mag: 2.56 },
      { name: '軒轅九 Epsilon Leo (ε Leo)', ra: 9.76, dec: 23.77, mag: 2.98 },
      { name: '西上相 Chertan (θ Leo)', ra: 11.24, dec: 15.43, mag: 3.34 }
    ],
    lines: [[0, 2], [2, 4], [2, 3], [3, 1], [1, 5], [5, 0]]
  },
  {
    id: 'Virgo',
    symbol: '♍',
    nameZh: '處女座',
    nameEn: 'Virgo',
    eclipticStart: 150,
    desc: '黃道第六宮（秋分點所在區域），主星為藍白色一等亮星角宿一 (Spica)。',
    stars: [
      { name: '角宿一 Spica (α Vir)', ra: 13.42, dec: -11.16, mag: 0.97 },
      { name: '東次將 Vindemiatrix (ε Vir)', ra: 13.04, dec: 10.96, mag: 2.83 },
      { name: '東上相 Porrima (γ Vir)', ra: 12.69, dec: -1.45, mag: 2.74 },
      { name: '角宿二 Heze (ζ Vir)', ra: 13.58, dec: -0.60, mag: 3.38 },
      { name: '右執法 Zavijava (β Vir)', ra: 11.85, dec: 1.76, mag: 3.61 }
    ],
    lines: [[4, 2], [2, 1], [2, 3], [3, 0]]
  },
  {
    id: 'Libra',
    symbol: '♎',
    nameZh: '天秤座',
    nameEn: 'Libra',
    eclipticStart: 180,
    desc: '黃道第七宮，象徵晝夜平分的天秤，主星為氐宿四與氐宿一。',
    stars: [
      { name: '氐宿四 Zubeneschamali (β Lib)', ra: 15.28, dec: -9.38, mag: 2.61 },
      { name: '氐宿一 Zubenelgenubi (α Lib)', ra: 14.85, dec: -16.04, mag: 2.75 },
      { name: '折威七 Brachium (σ Lib)', ra: 15.07, dec: -25.28, mag: 3.29 },
      { name: '氐宿三 Gamma Lib (γ Lib)', ra: 15.59, dec: -14.79, mag: 3.91 }
    ],
    lines: [[1, 0], [0, 3], [3, 2], [2, 1]]
  },
  {
    id: 'Scorpius',
    symbol: '♏',
    nameZh: '天蠍座',
    nameEn: 'Scorpius',
    eclipticStart: 210,
    desc: '黃道第八宮，夏季南天最顯著星座，核心為紅超巨星心宿二 (Antares)。',
    stars: [
      { name: '心宿二 Antares (α Sco)', ra: 16.49, dec: -26.43, mag: 1.06 },
      { name: '尾宿八 Shaula (λ Sco)', ra: 17.56, dec: -37.10, mag: 1.62 },
      { name: '尾宿五 Sargas (θ Sco)', ra: 17.62, dec: -43.00, mag: 1.86 },
      { name: '房宿三 Dschubba (δ Sco)', ra: 16.01, dec: -22.62, mag: 2.29 },
      { name: '房宿四 Acrab (β Sco)', ra: 16.09, dec: -19.81, mag: 2.62 },
      { name: '尾宿二 Epsilon Sco (ε Sco)', ra: 16.84, dec: -34.29, mag: 2.29 }
    ],
    lines: [[4, 3], [3, 0], [0, 5], [5, 2], [2, 1]]
  },
  {
    id: 'Sagittarius',
    symbol: '♐',
    nameZh: '射手座（人馬座）',
    nameEn: 'Sagittarius',
    eclipticStart: 240,
    desc: '黃道第九宮（冬至點所在區域），銀河系中心方向，包含著名的南斗六星（茶壺星群）。',
    stars: [
      { name: '箕宿三 Kaus Australis (ε Sgr)', ra: 18.40, dec: -34.38, mag: 1.79 },
      { name: '斗宿四 Nunki (σ Sgr)', ra: 18.92, dec: -26.30, mag: 2.05 },
      { name: '斗宿六 Ascella (ζ Sgr)', ra: 19.04, dec: -29.88, mag: 2.60 },
      { name: '箕宿二 Kaus Media (δ Sgr)', ra: 18.35, dec: -29.83, mag: 2.72 },
      { name: '斗宿二 Kaus Borealis (λ Sgr)', ra: 18.47, dec: -25.42, mag: 2.82 }
    ],
    lines: [[0, 3], [3, 4], [4, 1], [1, 2], [2, 0], [3, 2]]
  },
  {
    id: 'Capricornus',
    symbol: '♑',
    nameZh: '摩羯座',
    nameEn: 'Capricornus',
    eclipticStart: 270,
    desc: '黃道第十宮，由牛宿與壘壁陣構成的倒三角形星群。',
    stars: [
      { name: '壘壁陣四 Deneb Algedi (δ Cap)', ra: 21.78, dec: -16.13, mag: 2.85 },
      { name: '牛宿一 Dabih (β Cap)', ra: 20.35, dec: -14.78, mag: 3.05 },
      { name: '牛宿二 Algedi (α2 Cap)', ra: 20.30, dec: -12.51, mag: 3.58 },
      { name: '越 Psi Cap (ψ Cap)', ra: 20.77, dec: -25.27, mag: 4.13 }
    ],
    lines: [[2, 1], [1, 3], [3, 0], [0, 1]]
  },
  {
    id: 'Aquarius',
    symbol: '♒',
    nameZh: '水瓶座（寶瓶座）',
    nameEn: 'Aquarius',
    eclipticStart: 300,
    desc: '黃道第十一宮，擁有虛宿一 (Sadalsuud) 與危宿一 (Sadalmelik) 等亮星。',
    stars: [
      { name: '虛宿一 Sadalsuud (β Aqr)', ra: 21.53, dec: -5.57, mag: 2.90 },
      { name: '危宿一 Sadalmelik (α Aqr)', ra: 22.09, dec: -0.32, mag: 2.95 },
      { name: '羽林軍二十六 Skat (δ Aqr)', ra: 22.91, dec: -15.82, mag: 3.27 },
      { name: '墳墓一 Zeta Aqr (ζ Aqr)', ra: 22.48, dec: -0.02, mag: 3.65 }
    ],
    lines: [[0, 1], [1, 3], [3, 2]]
  },
  {
    id: 'Pisces',
    symbol: '♓',
    nameZh: '雙魚座',
    nameEn: 'Pisces',
    eclipticStart: 330,
    desc: '黃道第十二宮，現代春分點（太陽黃經 0° 交點）實際位於雙魚座範圍內。',
    stars: [
      { name: '右更二 Eta Psc (η Psc)', ra: 1.52, dec: 15.35, mag: 3.62 },
      { name: '外屏七 Alrescha (α Psc)', ra: 2.03, dec: 2.76, mag: 3.82 },
      { name: '霹靂二 Gamma Psc (γ Psc)', ra: 23.29, dec: 3.28, mag: 3.70 },
      { name: '雙魚座 ω (ω Psc)', ra: 23.99, dec: 6.86, mag: 4.03 }
    ],
    lines: [[0, 1], [1, 3], [3, 2]]
  }
];

/**
 * 其他重要全天指標星座（北天拱極、春夏秋冬四季大三角與南天標誌星群，共 18 座）
 */
export const OTHER_CONSTELLATIONS = [
  {
    id: 'UrsaMinor',
    nameZh: '小熊座（北極星）',
    nameEn: 'Ursa Minor',
    symbol: '🐻',
    desc: '北天拱極核心星座，斗柄最端為北天極指標恆星「勾陳一（北極星 Polaris）」。',
    stars: [
      { name: '北極星 Polaris (α UMi)', ra: 2.53, dec: 89.26, mag: 1.98 },
      { name: '帝星 Kochab (β UMi)', ra: 14.84, dec: 74.16, mag: 2.07 },
      { name: '太子 Pherkad (γ UMi)', ra: 15.35, dec: 71.83, mag: 3.00 },
      { name: '勾陳四 Yildun (δ UMi)', ra: 17.54, dec: 86.59, mag: 4.35 }
    ],
    lines: [[0, 3], [3, 2], [2, 1]]
  },
  {
    id: 'UrsaMajor',
    nameZh: '大熊座（北斗七星）',
    nameEn: 'Ursa Major',
    symbol: '🌟',
    desc: '北方天空最著名的北斗七星，斗口天樞與天璇兩星連線延伸 5 倍距離即可精準尋找北極星。',
    stars: [
      { name: '天樞 Dubhe (α UMa)', ra: 11.06, dec: 61.75, mag: 1.79 },
      { name: '天璇 Merak (β UMa)', ra: 11.03, dec: 56.38, mag: 2.37 },
      { name: '天璣 Phecda (γ UMa)', ra: 11.90, dec: 53.69, mag: 2.44 },
      { name: '天權 Megrez (δ UMa)', ra: 12.26, dec: 57.03, mag: 3.31 },
      { name: '玉衡 Alioth (ε UMa)', ra: 12.90, dec: 55.96, mag: 1.77 },
      { name: '開陽 Mizar (ζ UMa)', ra: 13.40, dec: 54.93, mag: 2.23 },
      { name: '搖光 Alkaid (η UMa)', ra: 13.79, dec: 49.31, mag: 1.86 }
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]]
  },
  {
    id: 'Cassiopeia',
    nameZh: '仙后座（W星群）',
    nameEn: 'Cassiopeia',
    symbol: '👑',
    desc: '北方星空著名的「W」型拱極星座，與大熊座北斗七星隔著北極星遙遙相對，同為尋找北天極的核心天標。',
    stars: [
      { name: '王良四 Schedar (α Cas)', ra: 0.68, dec: 56.54, mag: 2.24 },
      { name: '王良一 Caph (β Cas)', ra: 0.15, dec: 59.15, mag: 2.28 },
      { name: '策 Gamma Cas (γ Cas)', ra: 0.94, dec: 60.72, mag: 2.15 },
      { name: '閣道三 Ruchbah (δ Cas)', ra: 1.43, dec: 60.23, mag: 2.68 },
      { name: '閣道二 Segin (ε Cas)', ra: 1.90, dec: 63.67, mag: 3.35 }
    ],
    lines: [[1, 0], [0, 2], [2, 3], [3, 4]]
  },
  {
    id: 'Orion',
    nameZh: '獵戶座',
    nameEn: 'Orion',
    symbol: '🏹',
    desc: '橫跨天球赤道的冬季星座之王，擁有紅超巨星參宿四、藍超巨星參宿七與著名的獵戶腰帶三星。',
    stars: [
      { name: '參宿四 Betelgeuse (α Ori)', ra: 5.92, dec: 7.41, mag: 0.50 },
      { name: '參宿七 Rigel (β Ori)', ra: 5.24, dec: -8.20, mag: 0.13 },
      { name: '參宿五 Bellatrix (γ Ori)', ra: 5.42, dec: 6.35, mag: 1.64 },
      { name: '參宿二 Alnilam (ε Ori)', ra: 5.60, dec: -1.20, mag: 1.69 },
      { name: '參宿一 Alnitak (ζ Ori)', ra: 5.68, dec: -1.94, mag: 1.77 },
      { name: '參宿三 Mintaka (δ Ori)', ra: 5.53, dec: -0.30, mag: 2.23 },
      { name: '參宿六 Saiph (κ Ori)', ra: 5.80, dec: -9.67, mag: 2.09 }
    ],
    lines: [[0, 4], [4, 3], [3, 5], [5, 2], [2, 0], [4, 6], [6, 1], [1, 5]]
  },
  {
    id: 'CanisMajor',
    nameZh: '大犬座（天狼星）',
    nameEn: 'Canis Major',
    symbol: '🐕',
    desc: '冬季星空代表，主星「天狼星 (Sirius)」為全天肉眼可見最明亮的恆星（視星等 -1.46 等），亦為冬季大三角頂點。',
    stars: [
      { name: '天狼星 Sirius (α CMa)', ra: 6.75, dec: -16.72, mag: -1.46 },
      { name: '弧矢七 Adhara (ε CMa)', ra: 6.98, dec: -28.97, mag: 1.50 },
      { name: '弧矢二 Wezen (δ CMa)', ra: 7.14, dec: -26.39, mag: 1.83 },
      { name: '軍市一 Murzim (β CMa)', ra: 6.38, dec: -17.96, mag: 1.98 },
      { name: '弧矢一 Aludra (η CMa)', ra: 7.40, dec: -29.30, mag: 2.45 },
      { name: '孫增一 Zeta CMa (ζ CMa)', ra: 6.34, dec: -30.06, mag: 3.02 }
    ],
    lines: [[3, 0], [0, 2], [2, 1], [1, 5], [2, 4]]
  },
  {
    id: 'CanisMinor',
    nameZh: '小犬座（南河三）',
    nameEn: 'Canis Minor',
    symbol: '🐩',
    desc: '冬季大三角之一，主星南河三 (Procyon) 是一顆距離地球僅 11.4 光年的明亮黃白色一等星。',
    stars: [
      { name: '南河三 Procyon (α CMi)', ra: 7.65, dec: 5.22, mag: 0.38 },
      { name: '南河二 Gomeisa (β CMi)', ra: 7.45, dec: 8.29, mag: 2.89 }
    ],
    lines: [[1, 0]]
  },
  {
    id: 'Lyra',
    nameZh: '天琴座（織女星）',
    nameEn: 'Lyra',
    symbol: '🎵',
    desc: '夏季大三角最重要的成員，主星「織女一 (Vega)」為全天第五亮星，與牛郎星隔著銀河遙遙相望。',
    stars: [
      { name: '織女一 Vega (α Lyr)', ra: 18.62, dec: 38.78, mag: 0.03 },
      { name: '漸台二 Sheliak (β Lyr)', ra: 18.83, dec: 33.36, mag: 3.52 },
      { name: '漸台三 Sulafat (γ Lyr)', ra: 18.98, dec: 32.69, mag: 3.25 },
      { name: '漸台一 Delta2 Lyr (δ2 Lyr)', ra: 18.91, dec: 36.90, mag: 4.22 },
      { name: '織女三 Epsilon1 Lyr (ε1 Lyr)', ra: 18.74, dec: 39.67, mag: 4.67 },
      { name: '織女二 Zeta1 Lyr (ζ1 Lyr)', ra: 18.75, dec: 37.60, mag: 4.34 }
    ],
    lines: [[0, 5], [5, 3], [3, 2], [2, 1], [1, 5], [0, 4]]
  },
  {
    id: 'Aquila',
    nameZh: '天鷹座（牛郎星）',
    nameEn: 'Aquila',
    symbol: '🦅',
    desc: '夏季大三角頂點之一，主星「河鼓二（牛郎星 Altair）」與兩側扁擔星河鼓一、河鼓三宛如展翅翱翔的雄鷹。',
    stars: [
      { name: '河鼓二 Altair (α Aql)', ra: 19.85, dec: 8.87, mag: 0.77 },
      { name: '河鼓一 Tarazed (γ Aql)', ra: 19.77, dec: 10.61, mag: 2.72 },
      { name: '河鼓三 Alshain (β Aql)', ra: 19.92, dec: 6.41, mag: 3.71 },
      { name: '天市左垣六 Delta Aql (δ Aql)', ra: 19.42, dec: 3.11, mag: 3.36 },
      { name: '右旗三 Zeta Aql (ζ Aql)', ra: 19.09, dec: 13.86, mag: 2.99 },
      { name: '天市左垣七 Theta Aql (θ Aql)', ra: 20.19, dec: -0.82, mag: 3.24 },
      { name: '天市左垣八 Eta Aql (η Aql)', ra: 19.87, dec: 1.01, mag: 3.87 }
    ],
    lines: [[1, 0], [0, 2], [0, 3], [3, 4], [0, 6], [6, 5]]
  },
  {
    id: 'Cygnus',
    nameZh: '天鵝座（北十字）',
    nameEn: 'Cygnus',
    symbol: '🦢',
    desc: '座落於銀河之上的壯麗北十字，主星「天津四 (Deneb)」為夏季大三角最北端頂點，尾羽指向深邃銀河。',
    stars: [
      { name: '天津四 Deneb (α Cyg)', ra: 20.69, dec: 45.28, mag: 1.25 },
      { name: '天津一 Sadr (γ Cyg)', ra: 20.37, dec: 40.26, mag: 2.23 },
      { name: '輦道增七 Albireo (β Cyg)', ra: 19.51, dec: 27.96, mag: 3.08 },
      { name: '天津二 Delta Cyg (δ Cyg)', ra: 19.75, dec: 45.13, mag: 2.87 },
      { name: '天津九 Gienah (ε Cyg)', ra: 20.77, dec: 33.97, mag: 2.48 }
    ],
    lines: [[0, 1], [1, 2], [3, 1], [1, 4]]
  },
  {
    id: 'Bootes',
    nameZh: '牧夫座（大角星）',
    nameEn: 'Boötes',
    symbol: '🪁',
    desc: '春季星空代表，主星「大角星 (Arcturus)」為全天第四亮、北天第一亮星。順著北斗七星斗柄開陽、搖光延伸之春季大弧線即可抵達。',
    stars: [
      { name: '大角星 Arcturus (α Boo)', ra: 14.26, dec: 19.18, mag: -0.05 },
      { name: '梗河一 Izar (ε Boo)', ra: 14.75, dec: 27.07, mag: 2.35 },
      { name: '七公增五 Muphrid (η Boo)', ra: 13.91, dec: 18.39, mag: 2.68 },
      { name: '招搖 Seginus (γ Boo)', ra: 14.53, dec: 38.31, mag: 3.04 },
      { name: '帝席一 Nekkar (β Boo)', ra: 15.03, dec: 40.39, mag: 3.49 },
      { name: '梗河二 Delta Boo (δ Boo)', ra: 15.26, dec: 33.31, mag: 3.46 }
    ],
    lines: [[2, 0], [0, 1], [1, 5], [5, 4], [4, 3], [3, 1]]
  },
  {
    id: 'Auriga',
    nameZh: '御夫座（五車二）',
    nameEn: 'Auriga',
    symbol: '🛡',
    desc: '冬季六邊形之一，主星「五車二 (Capella)」為全天第六亮星，全星座構成巨大鮮明的五邊形幾何輪廓。',
    stars: [
      { name: '五車二 Capella (α Aur)', ra: 5.28, dec: 45.99, mag: 0.08 },
      { name: '五車三 Menkalinan (β Aur)', ra: 5.99, dec: 44.95, mag: 1.90 },
      { name: '五車五 Elnath (β Tau)', ra: 5.44, dec: 28.61, mag: 1.65 },
      { name: '五車四 Theta Aur (θ Aur)', ra: 5.99, dec: 37.21, mag: 2.65 },
      { name: '五車一 Iota Aur (ι Aur)', ra: 4.95, dec: 33.17, mag: 2.69 }
    ],
    lines: [[0, 1], [1, 3], [3, 2], [2, 4], [4, 0]]
  },
  {
    id: 'Pegasus',
    nameZh: '飛馬座（秋季四邊形）',
    nameEn: 'Pegasus',
    symbol: '🐎',
    desc: '秋季星空的標誌性骨架，由室宿一、室宿二、壁宿一與壁宿二組成顯眼的「秋季大四邊形」。',
    stars: [
      { name: '室宿一 Markab (α Peg)', ra: 23.08, dec: 15.21, mag: 2.49 },
      { name: '室宿二 Scheat (β Peg)', ra: 23.06, dec: 28.08, mag: 2.44 },
      { name: '壁宿一 Algenib (γ Peg)', ra: 0.22, dec: 15.18, mag: 2.84 },
      { name: '壁宿二 Alpheratz (α And)', ra: 0.14, dec: 29.09, mag: 2.07 },
      { name: '危宿三 Enif (ε Peg)', ra: 21.74, dec: 9.87, mag: 2.38 },
      { name: '雷電二 Zeta Peg (ζ Peg)', ra: 22.69, dec: 10.83, mag: 3.41 }
    ],
    lines: [[0, 1], [1, 3], [3, 2], [2, 0], [0, 5], [5, 4]]
  },
  {
    id: 'Andromeda',
    nameZh: '仙女座（M31大星系）',
    nameEn: 'Andromeda',
    symbol: '👸',
    desc: '與飛馬座相連的王族星座，包含肉眼可見的最遙遠深空天體——距地球約 250 萬光年的「仙女座大星系 (M31)」。',
    stars: [
      { name: '壁宿二 Alpheratz (α And)', ra: 0.14, dec: 29.09, mag: 2.07 },
      { name: '奎宿九 Mirach (β And)', ra: 1.16, dec: 35.62, mag: 2.07 },
      { name: '天大將軍一 Almach (γ And)', ra: 2.07, dec: 42.33, mag: 2.10 },
      { name: '奎宿五 Delta And (δ And)', ra: 0.65, dec: 30.86, mag: 3.27 },
      { name: '奎宿七 Mu And (μ And)', ra: 0.94, dec: 38.50, mag: 3.86 },
      { name: '奎宿八 Nu And (ν And / 鄰近M31)', ra: 0.83, dec: 41.09, mag: 4.53 }
    ],
    lines: [[0, 3], [3, 1], [1, 2], [1, 4], [4, 5]]
  },
  {
    id: 'Perseus',
    nameZh: '英仙座',
    nameEn: 'Perseus',
    symbol: '⚔',
    desc: '秋末初冬著名的英雄星座，每年八月英仙座流星雨輻射點所在，主星天船三與著名食變星大陵五 (Algol)。',
    stars: [
      { name: '天船三 Mirfak (α Per)', ra: 3.41, dec: 49.86, mag: 1.79 },
      { name: '大陵五 Algol (β Per)', ra: 3.14, dec: 40.96, mag: 2.09 },
      { name: '卷舌四 Epsilon Per (ε Per)', ra: 3.96, dec: 40.01, mag: 2.90 },
      { name: '天船二 Gamma Per (γ Per)', ra: 3.08, dec: 53.51, mag: 2.91 },
      { name: '卷舌二 Delta Per (δ Per)', ra: 3.72, dec: 47.79, mag: 3.01 },
      { name: '卷舌三 Zeta Per (ζ Per)', ra: 3.90, dec: 31.88, mag: 2.84 }
    ],
    lines: [[3, 0], [0, 4], [4, 2], [2, 5], [0, 1]]
  },
  {
    id: 'Cepheus',
    nameZh: '仙王座',
    nameEn: 'Cepheus',
    symbol: '🏰',
    desc: '北方拱極星座之一，輪廓呈尖頂房屋狀。主星造父一將於數千年後成為北極星；造父四為著名的造父變星原型（宇宙量天尺）。',
    stars: [
      { name: '少衛增八 Alderamin (α Cep)', ra: 21.31, dec: 62.59, mag: 2.45 },
      { name: '上衛增一 Alfirk (β Cep)', ra: 21.48, dec: 70.56, mag: 3.23 },
      { name: '造父一 Errai (γ Cep)', ra: 23.65, dec: 77.63, mag: 3.21 },
      { name: '造父二 Zeta Cep (ζ Cep)', ra: 22.18, dec: 58.20, mag: 3.39 },
      { name: '造父四 Delta Cep (δ Cep)', ra: 22.49, dec: 58.42, mag: 4.07 }
    ],
    lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 0]]
  },
  {
    id: 'Crux',
    nameZh: '南十字座',
    nameEn: 'Crux',
    symbol: '✝',
    desc: '南天星空無可取代的象徵標誌，由四顆璀璨亮星構成明朗十字形，長軸延伸 4.5 倍精確直指南天極。',
    stars: [
      { name: '十字架二 Acrux (α Cru)', ra: 12.44, dec: -63.10, mag: 0.76 },
      { name: '十字架三 Mimosa (β Cru)', ra: 12.80, dec: -59.69, mag: 1.25 },
      { name: '十字架一 Gacrux (γ Cru)', ra: 12.52, dec: -57.11, mag: 1.64 },
      { name: '十字架四 Imai (δ Cru)', ra: 12.25, dec: -58.75, mag: 2.79 }
    ],
    lines: [[2, 0], [1, 3]]
  },
  {
    id: 'Centaurus',
    nameZh: '半人馬座（南門二）',
    nameEn: 'Centaurus',
    symbol: '🏹',
    desc: '南天最著名的龐大星座之一，擁有全天第三亮星、距離太陽系最近的恆星系統「南門二 (Alpha Centauri)」，以及藍白巨星馬腹一。',
    stars: [
      { name: '南門二 Rigil Kentaurus (α Cen)', ra: 14.66, dec: -60.83, mag: -0.27 },
      { name: '馬腹一 Hadar (β Cen)', ra: 14.06, dec: -60.37, mag: 0.61 },
      { name: '庫樓一 Menkent (θ Cen)', ra: 14.11, dec: -36.37, mag: 2.06 },
      { name: '庫樓七 Gamma Cen (γ Cen)', ra: 12.69, dec: -48.96, mag: 2.20 },
      { name: '庫樓三 Epsilon Cen (ε Cen)', ra: 13.67, dec: -53.47, mag: 2.29 },
      { name: '庫樓二 Zeta Cen (ζ Cen)', ra: 13.92, dec: -47.29, mag: 2.55 }
    ],
    lines: [[0, 1], [1, 4], [4, 5], [5, 2], [4, 3]]
  },
  {
    id: 'Carina',
    nameZh: '船底座（老人星）',
    nameEn: 'Carina',
    symbol: '🚢',
    desc: '南天銀河璀璨星座，主星「老人星 (Canopus)」為全天第二亮星（視星等 -0.74 等），自古被視為象徵吉祥與長壽的南極老人星。',
    stars: [
      { name: '老人星 Canopus (α Car)', ra: 6.40, dec: -52.70, mag: -0.74 },
      { name: '海石一 Miaplacidus (β Car)', ra: 9.22, dec: -69.72, mag: 1.67 },
      { name: '南船五 Avior (ε Car)', ra: 8.38, dec: -59.51, mag: 1.86 },
      { name: '南船三 Aspidiske (ι Car)', ra: 9.28, dec: -59.28, mag: 2.21 }
    ],
    lines: [[0, 2], [2, 3], [3, 1]]
  },
  {
    id: 'Corvus',
    nameZh: '烏鴉座',
    nameEn: 'Corvus',
    symbol: '🐦',
    desc: '春夜南方星空最清晰辨識的四邊形指標星座，四顆主星整齊醒目，有如夜空中的一扇明亮帆檣。',
    stars: [
      { name: '軫宿一 Gienah (γ Crv)', ra: 12.26, dec: -17.54, mag: 2.58 },
      { name: '軫宿三 Kraz (β Crv)', ra: 12.57, dec: -23.40, mag: 2.65 },
      { name: '軫宿二 Algorab (δ Crv)', ra: 12.50, dec: -16.52, mag: 2.94 },
      { name: '軫宿四 Minkar (ε Crv)', ra: 12.17, dec: -22.62, mag: 3.02 },
      { name: '右轄 Alchiba (α Crv)', ra: 12.14, dec: -24.73, mag: 4.02 }
    ],
    lines: [[0, 2], [2, 1], [1, 3], [3, 0], [3, 4]]
  }
];
