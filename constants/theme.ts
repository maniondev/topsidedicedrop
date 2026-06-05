export const GameColors = {
  red:    '#E45757',
  orange: '#F2994A',
  yellow: '#F2C94C',
  green:  '#27AE60',
  blue:   '#2F80ED',
  purple: '#9B51E0',
  black:  '#1A1A1A',
} as const;

export const GameColorsDim = {
  red:    '#7A2F2F',
  orange: '#7A4D25',
  yellow: '#7A6526',
  green:  '#155C34',
  blue:   '#183F75',
  purple: '#4D2870',
  black:  '#111111',
} as const;

export type FaceColorName = keyof typeof GameColors;

export const FACE_COLOR_SEQUENCE: FaceColorName[] = [
  'red', 'orange', 'yellow', 'green', 'blue', 'purple',
];

export type ThemeColors = {
  background:    string;
  surface:       string;
  surfaceRaise:  string;
  card:          string;
  cardBorder:    string;
  text:          string;
  textSecondary: string;
  textMuted:     string;
  textDim:       string;
  accent:        string;
  accentDim:     string;
  accentText:    string;
  blue:          string;
  blueDim:       string;
  premiumGold:   string;
  premiumBg:     string;
  border:        string;
  separator:     string;
  inputBg:       string;
  danger:        string;
  success:       string;
  adBg:          string;
  adBorder:      string;
  statusBar:     'light' | 'dark';
  // Optional level-card background tint overrides (defaults to success/premiumGold at low opacity)
  successTint?:   string;
  perfectTint?:   string;
  // Optional separate color for perfect-level tile indicators (border, trophy, number, score)
  // Falls back to premiumGold if not set
  perfectColor?:  string;
  // Optional per-theme icon container background (AppLogo). Falls back to card if unset.
  iconBg?: string;
  // When true, AppLogo gradient runs dark-center → light-edge (inverted vignette).
  invertLogoGradient?: boolean;
  // Edge color for inverted logo gradient. Falls back to card if unset.
  iconBgEdge?: string;
  // Optional stat card color overrides on the Play tab
  statSolvedColor?:  string;
  statPerfectColor?: string;
  // Optional per-theme game color overrides (replaces GameColors for die faces/targets)
  gameColors?:     Partial<Record<FaceColorName, string>>;
  gameColorsDim?:  Partial<Record<FaceColorName, string>>;
  lightGameColors?: boolean; // true when game face colors are light — use dark dots instead of white
  // Face names that should get darker dots + border on this theme (e.g. yellow on light backgrounds)
  darkenFaceColors?: FaceColorName[];
  // Explicit dot/border color to use for each darkened face (falls back to rgba dark if omitted)
  darkenFaceColorsDot?: Partial<Record<FaceColorName, string>>;
};

export type ThemeId = 'dice' | 'light' | 'dark' | 'pastel' | 'grayscale' | 'neon';

export const ThemeMeta: Record<ThemeId, { label: string; swatches: [string, string, string] }> = {
  dice:    { label: 'Topside',   swatches: ['#F4EDDD', '#F8F3E8', '#F08A2C'] },
  dark:    { label: 'Dark',      swatches: ['#0A0A14', '#1E1E32', '#6C63FF'] },
  light:   { label: 'Light',     swatches: ['#F4F4F8', '#FFFFFF', '#5558EF'] },
  pastel:  { label: 'Pastel',    swatches: ['#F3EEF9', '#FEFBFF', '#9B72E0'] },
  neon:    { label: 'Neon',      swatches: ['#000005', '#0A0A1E', '#00FFFF'] },
  grayscale: { label: 'Grayscale', swatches: ['#F8F8F8', '#FFFFFF', '#222222'] },
};

export const THEME_IDS: ThemeId[] = ['dice', 'light', 'dark', 'pastel', 'grayscale', 'neon'];

export const Themes: Record<ThemeId, ThemeColors> = {
  dice: {
    background:    '#FAF6EE',
    surface:       '#FEFCF8',
    surfaceRaise:  '#F2EAD8',
    card:          '#FBF8F2',
    cardBorder:    '#E8D8BC',
    text:          '#1F1A14',
    textSecondary: '#705A40',
    textMuted:     '#A89070',
    textDim:       '#A89070',
    accent:        '#F08A2C',
    accentDim:     '#FDEBD0',
    accentText:    '#FFFFFF',
    blue:          '#F08A2C',
    blueDim:       '#FDEBD0',
    premiumGold:   '#F08A2C',
    premiumBg:     '#FEF0E6',
    border:        '#D8C8A0',
    separator:     '#F2EAD8',
    inputBg:       '#F5F0E4',
    danger:        '#C8302C',
    success:       '#F08A2C',
    successTint:   '#F08A2C12',
    perfectTint:   '#E5384812',
    perfectColor:  '#E53848',
    statSolvedColor:  '#F08A2C',
    statPerfectColor: '#E53848',
    iconBg:        '#F3EEDF',
    adBg:          '#F2EAD8',
    adBorder:      '#E0CCA8',
    statusBar:     'dark',
    darkenFaceColors: ['yellow'],
    darkenFaceColorsDot: { yellow: '#C8A028' },
  },
  dark: {
    background:    '#090C14',
    surface:       '#111620',
    surfaceRaise:  '#181E2E',
    card:          '#1A2030',
    cardBorder:    '#263048',
    text:          '#EEF2FF',
    textSecondary: '#8899BB',
    textMuted:     '#445066',
    textDim:       '#445066',
    accent:        '#2F80ED',
    accentDim:     '#1A3A6A',
    accentText:    '#FFFFFF',
    blue:          '#2F80ED',
    blueDim:       '#1A3A6A',
    premiumGold:   '#F2C94C',
    premiumBg:     '#1F1A0A',
    border:        '#1E2A40',
    separator:     '#141C2C',
    inputBg:       '#111A28',
    danger:        '#E45757',
    success:       '#27AE60',
    iconBg:        '#101524',
    invertLogoGradient: true,
    adBg:          '#0C1220',
    adBorder:      '#1E2A40',
    statusBar:     'light',
  },
  light: {
    background:    '#F4F4F8',
    surface:       '#FFFFFF',
    surfaceRaise:  '#E4E4EE',
    card:          '#F8F8FC',
    cardBorder:    '#D0D0E0',
    text:          '#1A1A2E',
    textSecondary: '#6B6B8A',
    textMuted:     '#AABBD0',
    textDim:       '#AABBD0',
    accent:        '#2F80ED',
    accentDim:     '#D0E4FF',
    accentText:    '#FFFFFF',
    blue:          '#2F80ED',
    blueDim:       '#D0E4FF',
    premiumGold:   '#C8900A',
    premiumBg:     '#FFFBE8',
    border:        '#C0D4EC',
    separator:     '#EEF4FB',
    inputBg:       '#EEF4FB',
    danger:        '#CC3333',
    success:       '#1E8840',
    iconBg:        '#E9E9F3',
    adBg:          '#F0F0F8',
    adBorder:      '#D8D8EE',
    statusBar:     'dark',
    darkenFaceColors: ['yellow'],
    darkenFaceColorsDot: { yellow: '#C8A028' },
  },
  pastel: {
    background:    '#EDE4F8',
    surface:       '#F7F2FF',
    surfaceRaise:  '#DAC8F0',
    card:          '#F5EFFE',
    cardBorder:    '#C8B4E4',
    text:          '#2D2248',
    textSecondary: '#8070A8',
    textMuted:     '#B8A8D0',
    textDim:       '#B8A8D0',
    accent:        '#9B72E0',
    accentDim:     '#E8DEFF',
    accentText:    '#FFFFFF',
    blue:          '#9B72E0',
    blueDim:       '#E8DEFF',
    premiumGold:   '#C8922A',
    premiumBg:     '#FFF8E8',
    border:        '#C4AADC',
    separator:     '#E4D8F5',
    inputBg:       '#EDE4F8',
    danger:        '#CC4455',
    success:       '#3A9060',
    iconBg:        '#E3D8F5',
    adBg:          '#E4D8F5',
    adBorder:      '#D8C8EE',
    statusBar:     'dark',
    lightGameColors: true,
    // Baby pastel die face colors
    gameColors: {
      red:    '#FFB3C1',
      orange: '#FFD4AA',
      yellow: '#FFF2A8',
      green:  '#B8EDD8',
      blue:   '#AECFEE',
      purple: '#D4BAEE',
      black:  '#666077',
    },
    gameColorsDim: {
      red:    '#CC8095',
      orange: '#CC9970',
      yellow: '#CCBC60',
      green:  '#6AB895',
      blue:   '#7099BB',
      purple: '#9970BB',
      black:  '#333344',
    },
  },
  neon: {
    background:    '#000005',
    surface:       '#05050F',
    surfaceRaise:  '#16163A',
    card:          '#10102A',
    cardBorder:    '#4A2EAA',
    text:          '#F0FAFF',
    textSecondary: '#5A9FCC',
    textMuted:     '#3A4A80',
    textDim:       '#6A7FBB',
    accent:        '#00FFFF',
    accentDim:     '#003A44',
    accentText:    '#000510',
    blue:          '#9B5CF6',
    blueDim:       '#1A0A44',
    premiumGold:   '#00FFFF',
    premiumBg:     '#001A1A',
    border:        '#36228A',
    separator:     '#08080E',
    inputBg:       '#040410',
    danger:        '#FF1744',
    success:       '#FFE600',
    successTint:   '#FFE60014',
    iconBg:        '#060617',
    iconBgEdge:    '#18183A',
    invertLogoGradient: true,
    adBg:          '#040410',
    adBorder:      '#101840',
    statusBar:     'light',
  },
  grayscale: {
    background:    '#F8F8F8',
    surface:       '#FFFFFF',
    surfaceRaise:  '#E8E8E8',
    card:          '#F4F4F4',
    cardBorder:    '#D4D4D4',
    text:          '#111111',
    textSecondary: '#666666',
    textMuted:     '#AAAAAA',
    textDim:       '#AAAAAA',
    accent:        '#222222',
    accentDim:     '#DDDDDD',
    accentText:    '#FFFFFF',
    blue:          '#333333',
    blueDim:       '#CCCCCC',
    premiumGold:   '#B8860B',
    premiumBg:     '#FFFAEE',
    border:        '#C8C8C8',
    separator:     '#F0F0F0',
    inputBg:       '#F4F4F4',
    danger:        '#CC2222',
    success:       '#226622',
    adBg:          '#F4F4F4',
    adBorder:      '#E0E0E0',
    statusBar:     'dark',
    // Grayscale die faces — dots are the only differentiator
    gameColors: {
      red:    '#111111',
      orange: '#2E2E2E',
      yellow: '#4A4A4A',
      green:  '#666666',
      blue:   '#838383',
      purple: '#9F9F9F',
      black:  '#080808',
    },
    gameColorsDim: {
      red:    '#090909',
      orange: '#1A1A1A',
      yellow: '#2B2B2B',
      green:  '#3C3C3C',
      blue:   '#4D4D4D',
      purple: '#5E5E5E',
      black:  '#050505',
    },
    iconBg:        '#E5E5E5',
  },
};

