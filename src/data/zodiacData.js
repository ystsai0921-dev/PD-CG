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
 * 其他重要全天指標星座（協助定位北天極、冬季與夏季大三角）
 */
export const OTHER_CONSTELLATIONS = [
  {
    id: 'UrsaMinor',
    nameZh: '小熊座（北極星）',
    nameEn: 'Ursa Minor',
    desc: '包含北天極指標星「勾陳一 (Polaris)」。',
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
    desc: '北方天空最著名的北斗七星，斗口天樞、天璇連線延伸可找到北極星。',
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
    id: 'Orion',
    nameZh: '獵戶座',
    nameEn: 'Orion',
    desc: '橫跨天球赤道的冬季星座之王，擁有參宿四、參宿七與獵戶腰帶三星。',
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
    id: 'Cygnus',
    nameZh: '天鵝座',
    nameEn: 'Cygnus',
    desc: '銀河上的北十字，主星天津四為夏季大三角之一。',
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
    id: 'Crux',
    nameZh: '南十字座',
    nameEn: 'Crux',
    desc: '南天極指標星座，由四顆亮星組成小巧明亮的十字形。',
    stars: [
      { name: '十字架二 Acrux (α Cru)', ra: 12.44, dec: -63.10, mag: 0.76 },
      { name: '十字架三 Mimosa (β Cru)', ra: 12.80, dec: -59.69, mag: 1.25 },
      { name: '十字架一 Gacrux (γ Cru)', ra: 12.52, dec: -57.11, mag: 1.64 },
      { name: '十字架四 Imai (δ Cru)', ra: 12.25, dec: -58.75, mag: 2.79 }
    ],
    lines: [[2, 0], [1, 3]]
  }
];
