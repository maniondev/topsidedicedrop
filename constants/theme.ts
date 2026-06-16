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
  gridLine?:     string; // game-board grid lines (falls back to separator)
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
  // When set, stat/leaderboard numbers use this color instead of text
  statNumColor?: string;
  // Optional per-theme game color overrides (replaces GameColors for die faces/targets)
  gameColors?:     Partial<Record<FaceColorName, string>>;
  gameColorsDim?:  Partial<Record<FaceColorName, string>>;
  lightGameColors?: boolean; // true when game face colors are light — use dark dots instead of white
  // Face names that should get darker dots + border on this theme (e.g. yellow on light backgrounds)
  darkenFaceColors?: FaceColorName[];
  // Explicit dot/border color to use for each darkened face (falls back to rgba dark if omitted)
  darkenFaceColorsDot?: Partial<Record<FaceColorName, string>>;
  // Optional color for the "Topside" wordmark on the home screen (falls back to text)
  titleColor?: string;
};

export type ThemeId = 'dice' | 'light' | 'dark' | 'pastel' | 'grayscale' | 'neon' | 'sunset' | 'ocean' | 'forest';

export const ThemeMeta: Record<ThemeId, { label: string; swatches: [string, string, string] }> = {
  dice:      { label: 'Topside',   swatches: ['#F4EDDD', '#F8F3E8', '#F08A2C'] },
  dark:      { label: 'Dark',      swatches: ['#0A0A14', '#1E1E32', '#6C63FF'] },
  light:     { label: 'Light',     swatches: ['#F4F4F8', '#FFFFFF', '#5558EF'] },
  pastel:    { label: 'Pastel',    swatches: ['#F3EEF9', '#FEFBFF', '#9B72E0'] },
  neon:      { label: 'Neon',      swatches: ['#000005', '#0A0A1E', '#00FFFF'] },
  grayscale: { label: 'Grayscale', swatches: ['#F8F8F8', '#FFFFFF', '#222222'] },
  sunset:    { label: 'Sunset',    swatches: ['#1C1008', '#2E1A0C', '#D94050'] },
  ocean:     { label: 'Ocean',     swatches: ['#0A1828', '#112238', '#00C4B4'] },
  forest:    { label: 'Forest',    swatches: ['#0F1F12', '#182A1A', '#C4956A'] },
};

export const THEME_IDS: ThemeId[] = ['dice', 'light', 'dark', 'pastel', 'grayscale', 'neon', 'sunset', 'ocean', 'forest'];

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
    gridLine:      '#E4D6B6',
    inputBg:       '#F5F0E4',
    danger:        '#C8302C',
    success:       '#F08A2C',
    successTint:   '#F08A2C12',
    perfectTint:   '#E5384812',
    perfectColor:  '#E53848',
    statSolvedColor:  '#F08A2C',
    statPerfectColor: '#E53848',
    statNumColor:  '#5A4830',
    titleColor:    '#4A3020',
    iconBg:        '#F3EEDF',
    adBg:          '#F2EAD8',
    adBorder:      '#E0CCA8',
    statusBar:     'dark',
    // Topside theme: white pips on every die, including yellow (consistent look).
  },
  dark: {
    background:    '#090C14',
    surface:       '#111620',
    surfaceRaise:  '#181E2E',
    card:          '#1A2030',
    cardBorder:    '#263048',
    text:          '#EEF2FF',
    textSecondary: '#8899BB',
    textMuted:     '#5F7090',
    textDim:       '#5F7090',
    accent:        '#2F80ED',
    accentDim:     '#1A3A6A',
    accentText:    '#FFFFFF',
    blue:          '#2F80ED',
    blueDim:       '#1A3A6A',
    premiumGold:   '#2F80ED',
    premiumBg:     '#0A1A30',
    border:        '#1E2A40',
    separator:     '#141C2C',
    gridLine:      '#2A3553',
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
    textMuted:     '#7A90B0',
    textDim:       '#7A90B0',
    accent:        '#2F80ED',
    accentDim:     '#D0E4FF',
    accentText:    '#FFFFFF',
    blue:          '#2F80ED',
    blueDim:       '#D0E4FF',
    premiumGold:   '#2F80ED',
    premiumBg:     '#E8F0FC',
    border:        '#C0D4EC',
    separator:     '#EEF4FB',
    gridLine:      '#D5DEEC',
    inputBg:       '#EEF4FB',
    danger:        '#CC3333',
    success:       '#1E8840',
    statNumColor:  '#555570',
    iconBg:        '#E9E9F3',
    adBg:          '#F0F0F8',
    adBorder:      '#D8D8EE',
    statusBar:     'dark',
  },
  pastel: {
    background:    '#EDE4F8',
    surface:       '#F7F2FF',
    surfaceRaise:  '#DAC8F0',
    card:          '#F5EFFE',
    cardBorder:    '#C8B4E4',
    text:          '#2D2248',
    textSecondary: '#8070A8',
    textMuted:     '#8878B0',
    textDim:       '#8878B0',
    accent:        '#9B72E0',
    accentDim:     '#E8DEFF',
    accentText:    '#FFFFFF',
    blue:          '#9B72E0',
    blueDim:       '#E8DEFF',
    premiumGold:   '#9B72E0',
    premiumBg:     '#EDE4FF',
    border:        '#C4AADC',
    separator:     '#E4D8F5',
    gridLine:      '#D3C2EC',
    inputBg:       '#EDE4F8',
    danger:        '#CC4455',
    success:       '#3A9060',
    iconBg:        '#E3D8F5',
    adBg:          '#E4D8F5',
    adBorder:      '#D8C8EE',
    statusBar:     'dark',
    // Baby pastel die face colors
    gameColors: {
      red:    '#F08099',
      orange: '#F0B070',
      yellow: '#EDD870',
      green:  '#80CCA8',
      blue:   '#80AADD',
      purple: '#B890D8',
      black:  '#555068',
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
    textMuted:     '#6070A8',
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
    gridLine:      '#20305F',
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
    lightGameColors: true,
    gameColors: {
      red:    '#FF0022',
      orange: '#FF6600',
      yellow: '#FFF500',
      green:  '#00FF44',
      blue:   '#00F0FF',
      purple: '#FF00FF',
      black:  '#0A0A1E',
    },
    gameColorsDim: {
      red:    '#99002A',
      orange: '#994200',
      yellow: '#998A00',
      green:  '#007040',
      blue:   '#008A8A',
      purple: '#7A0090',
      black:  '#050510',
    },
  },
  sunset: {
    background:    '#1C1008',
    surface:       '#281510',
    surfaceRaise:  '#3A1E10',
    card:          '#2E1A0C',
    cardBorder:    '#5A3018',
    text:          '#FFE4C0',
    textSecondary: '#C08040',
    textMuted:     '#9A6030',
    textDim:       '#9A6030',
    accent:        '#D94050',
    accentDim:     '#4A1018',
    accentText:    '#FFFFFF',
    blue:          '#D94050',
    blueDim:       '#4A1018',
    premiumGold:   '#D94050',
    premiumBg:     '#1E0A0E',
    border:        '#4A2A14',
    separator:     '#281408',
    gridLine:      '#3A2010',
    inputBg:       '#221208',
    danger:        '#FF5544',
    success:       '#D94050',
    iconBg:        '#241210',
    adBg:          '#221008',
    adBorder:      '#4A2018',
    statusBar:     'light',
    invertLogoGradient: true,
    gameColors: {
      red:    '#D94050',
      orange: '#E07820',
      yellow: '#D4A020',
      green:  '#7A9060',
      blue:   '#5060A0',
      purple: '#8A4A9A',
      black:  '#1A0E08',
    },
    gameColorsDim: {
      red:    '#8A1E28',
      orange: '#8A4810',
      yellow: '#826010',
      green:  '#485838',
      blue:   '#303A60',
      purple: '#522C5A',
      black:  '#0E0806',
    },
  },
  ocean: {
    background:    '#0A1828',
    surface:       '#0F2030',
    surfaceRaise:  '#162A40',
    card:          '#112238',
    cardBorder:    '#1E3D58',
    text:          '#D4F0FF',
    textSecondary: '#5A9FBF',
    textMuted:     '#4A7898',
    textDim:       '#4A7A98',
    accent:        '#00C4B4',
    accentDim:     '#003A38',
    accentText:    '#001818',
    blue:          '#00C4B4',
    blueDim:       '#003A38',
    premiumGold:   '#00C4B4',
    premiumBg:     '#001E1C',
    border:        '#1A3A58',
    separator:     '#0E2035',
    gridLine:      '#162E48',
    inputBg:       '#0C1E30',
    danger:        '#E45757',
    success:       '#00C4B4',
    iconBg:        '#0D1F35',
    adBg:          '#0A1828',
    adBorder:      '#183250',
    statusBar:     'light',
    invertLogoGradient: true,
    gameColors: {
      red:    '#C83840',
      orange: '#C87830',
      yellow: '#78C840',
      green:  '#30A888',
      blue:   '#2870C8',
      purple: '#6840A8',
      black:  '#080C18',
    },
    gameColorsDim: {
      red:    '#782028',
      orange: '#784818',
      yellow: '#487828',
      green:  '#1C6050',
      blue:   '#184078',
      purple: '#3C2460',
      black:  '#040608',
    },
  },
  forest: {
    background:    '#0F1F12',
    surface:       '#162516',
    surfaceRaise:  '#1E3020',
    card:          '#182A1A',
    cardBorder:    '#2A4A2E',
    text:          '#D8F0D0',
    textSecondary: '#6A9A60',
    textMuted:     '#527848',
    textDim:       '#4A7848',
    accent:        '#C4956A',
    accentDim:     '#3A2410',
    accentText:    '#1A0E06',
    blue:          '#C4956A',
    blueDim:       '#3A2410',
    premiumGold:   '#C4956A',
    premiumBg:     '#1E1208',
    border:        '#244028',
    separator:     '#142018',
    gridLine:      '#1C3020',
    inputBg:       '#121C13',
    danger:        '#E45757',
    success:       '#C4956A',
    iconBg:        '#142018',
    adBg:          '#101A12',
    adBorder:      '#1E3520',
    statusBar:     'light',
    invertLogoGradient: true,
    gameColors: {
      red:    '#8C3A2A',
      orange: '#9E5530',
      yellow: '#B8922A',
      green:  '#546E3A',
      blue:   '#405E6A',
      purple: '#5C4060',
      black:  '#1A0E0A',
    },
    gameColorsDim: {
      red:    '#5A2418',
      orange: '#663820',
      yellow: '#7A6018',
      green:  '#384A28',
      blue:   '#2C4050',
      purple: '#3C2840',
      black:  '#0E0806',
    },
  },
  grayscale: {
    background:    '#F8F8F8',
    surface:       '#FFFFFF',
    surfaceRaise:  '#E8E8E8',
    card:          '#F4F4F4',
    cardBorder:    '#D4D4D4',
    text:          '#111111',
    textSecondary: '#666666',
    textMuted:     '#888888',
    textDim:       '#888888',
    accent:        '#222222',
    accentDim:     '#DDDDDD',
    accentText:    '#FFFFFF',
    blue:          '#333333',
    blueDim:       '#CCCCCC',
    premiumGold:   '#222222',
    premiumBg:     '#E8E8E8',
    border:        '#C8C8C8',
    separator:     '#F0F0F0',
    gridLine:      '#D8D8D8',
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

