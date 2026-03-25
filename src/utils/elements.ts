import { LotteryData } from '@/types';
import { digitSum, getWaveColor, getFiveElement, getZodiacPosition, getSegment } from './mappings';
import { loadAliases, getCustomElements } from './storage';
import { chineseToNumber, calculateElementValue as sharedCalculateElementValue } from './workerShared';

// 元素别名映射表
const ELEMENT_ALIASES: Record<string, string> = {
  // 特码相关 - 标准名称：特号、特头、特尾、特合、特波、特段、特行、特肖位
  '特码': '特号',
  '特': '特号',
  '特码头': '特头',
  '特码尾': '特尾',
  '特码合': '特合',
  '特码波': '特波',
  '特码段': '特段',
  '特码行': '特行',
  '特码肖位': '特肖位',
  // 平码相关 - 支持"平六波"、"平6波"
  '平一': '平1',
  '平二': '平2',
  '平三': '平3',
  '平四': '平4',
  '平五': '平5',
  '平六': '平6',
  // 平码号别名：平码1=平1号
  '平码1': '平1号',
  '平码2': '平2号',
  '平码3': '平3号',
  '平码4': '平4号',
  '平码5': '平5号',
  '平码6': '平6号',
  // 平码属性简写：1头=平1头, 1行=平1行, 1肖位=平1肖位
  '1头': '平1头', '2头': '平2头', '3头': '平3头', '4头': '平4头', '5头': '平5头', '6头': '平6头',
  '1尾': '平1尾', '2尾': '平2尾', '3尾': '平3尾', '4尾': '平4尾', '5尾': '平5尾', '6尾': '平6尾',
  '1合': '平1合', '2合': '平2合', '3合': '平3合', '4合': '平4合', '5合': '平5合', '6合': '平6合',
  '1行': '平1行', '2行': '平2行', '3行': '平3行', '4行': '平4行', '5行': '平5行', '6行': '平6行',
  '1肖位': '平1肖位', '2肖位': '平2肖位', '3肖位': '平3肖位', '4肖位': '平4肖位', '5肖位': '平5肖位', '6肖位': '平6肖位',
  '1波': '平1波', '2波': '平2波', '3波': '平3波', '4波': '平4波', '5波': '平5波', '6波': '平6波',
  '1段': '平1段', '2段': '平2段', '3段': '平3段', '4段': '平4段', '5段': '平5段', '6段': '平6段',
  '1合头': '平1合头', '2合头': '平2合头', '3合头': '平3合头', '4合头': '平4合头', '5合头': '平5合头', '6合头': '平6合头',
  '1合尾': '平1合尾', '2合尾': '平2合尾', '3合尾': '平3合尾', '4合尾': '平4合尾', '5合尾': '平5合尾', '6合尾': '平6合尾',
  // 总分相关
  '总分数': '总分',
  '总分合': '总分合',
  '总分尾': '总分尾',
  '总': '总分',
  // 期数相关
  '期数合': '期数合',
  '期数尾': '期数尾',
  '期数合尾': '期数合尾',
  '期合尾': '期数合尾',
  '期合': '期数合',
  '期': '期数',
};

// 标准化元素名称
export function normalizeElementName(name: string, userAliases: Record<string, string[]> = loadAliases()): string {
  let normalized = name;
  
  // 保护结果类型不被替换（如五行类、肖位类等）
  // 使用不会与别名冲突的占位符
  const rtList: string[] = [];
  const resultTypes = ['五行类', '肖位类', '波色类', '尾数类', '头数类', '合数类', '单特类', '大小单双类'];
  for (const rt of resultTypes) {
    const placeholder = `__TYP${rtList.length}__`;
    normalized = normalized.replace(new RegExp(rt, 'g'), placeholder);
    rtList.push(rt);
  }
  
  // 先保护完整的元素名称，避免被chineseToNumber错误转换
  normalized = normalized.replace(/期数合尾/g, '__QISHU_HEWEI__');
  normalized = normalized.replace(/期数合/g, '__QISHU_HE__');
  normalized = normalized.replace(/期数尾/g, '__QISHU_WEI__');
  normalized = normalized.replace(/期数/g, '__QISHU__');
  normalized = normalized.replace(/总分合尾/g, '__ZONGFEN_HEWEI__');
  normalized = normalized.replace(/总分合/g, '__ZONGFEN_HE__');
  normalized = normalized.replace(/总分尾/g, '__ZONGFEN_WEI__');
  normalized = normalized.replace(/总分/g, '__ZONGFEN__');
  
  normalized = chineseToNumber(normalized);
  
  // 还原元素名称
  normalized = normalized.replace(/__QISHU__/g, '期数');
  normalized = normalized.replace(/__QISHU_WEI__/g, '期数尾');
  normalized = normalized.replace(/__QISHU_HE__/g, '期数合');
  normalized = normalized.replace(/__QISHU_HEWEI__/g, '期数合尾');
  normalized = normalized.replace(/__ZONGFEN__/g, '总分');
  normalized = normalized.replace(/__ZONGFEN_WEI__/g, '总分尾');
  normalized = normalized.replace(/__ZONGFEN_HE__/g, '总分合');
  normalized = normalized.replace(/__ZONGFEN_HEWEI__/g, '总分合尾');
  
  // helper: escape regex special chars
  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // helper to create a regex that handles doubling of standard name suffix
  function applyAlias(str: string, alias: string, standard: string): string {
    let patternStr = `(?<![平特])${escapeRegex(alias)}`;
    
    // Case 1: Standard ends with alias or standard starts with alias (e.g., 期 -> 期数, 总 -> 总分)
    // We want to match the alias followed by any number of the standard name's suffix
    if (standard.startsWith(alias) && standard.length > alias.length) {
      const suffix = standard.slice(alias.length);
      // Only handle simple character suffixes to avoid complex regex
      if (/^[\u4e00-\u9fa5a-zA-Z0-9]+$/.test(suffix)) {
        // 添加负向前瞻，确保不在特码属性（头、尾、合等）前面
        patternStr += `(?:${escapeRegex(suffix)})*(?![头尾合波段行肖位])`;
      }
    } 
    // Case 2: Standard is the same as alias, allow matching repeated alias (e.g., 特 -> 特)
    else if (alias === standard) {
      // 添加负向前瞻，确保不在特码属性（头、尾、合等）前面
      patternStr = `(?<![平特])${escapeRegex(alias)}+(?![头尾合波段行肖位])`;
    }
    
    const pattern = new RegExp(patternStr, 'g');
    return str.replace(pattern, standard);
  }

  // 首先应用用户自定义别名
  const sortedUserAliases = Object.entries(userAliases).flatMap(([standard, aliasList]) => 
    aliasList.map(alias => [alias, standard])
  ).sort((a, b) => b[0].length - a[0].length);

  for (const [alias, standard] of sortedUserAliases) {
    normalized = applyAlias(normalized, alias, standard);
  }

  // 然后处理内置别名
  const sortedBuiltInAliases = Object.entries(ELEMENT_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, standard] of sortedBuiltInAliases) {
    normalized = applyAlias(normalized, alias, standard);
  }

  // 特殊处理：平码属性（支持中文数字和阿拉伯数字混合，以及合头/合尾）
  // 1. 处理合尾/合头
  const pingHeAttrPattern = /平([一二三四五六1-6])?合(头|尾)/g;
  normalized = normalized.replace(pingHeAttrPattern, (_match, num, attr) => {
    const cnMap: Record<string, string> = { '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6' };
    const finalNum = cnMap[num] || num || '1';
    return `平${finalNum}合${attr}`;
  });

  // 2. 处理其他单字属性
  const pingAttrPattern = /平([一二三四五六1-6])?(波|头|尾|合|肖位|段|行|号)/g;
  normalized = normalized.replace(pingAttrPattern, (_match, num, attr) => {
    const cnMap: Record<string, string> = { '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6' };
    const finalNum = cnMap[num] || num || '1';
    return `平${finalNum}${attr}`;
  });
  
  // 简化格式处理
  // "四五行" -> "平4行"
  normalized = normalized.replace(/^(\d)五行$/, '平$1行');
  // "五肖位" -> "平5肖位"
  normalized = normalized.replace(/^(\d)肖位$/, '平$1肖位');
  // "二波" -> "平2波"
  normalized = normalized.replace(/^(\d)波$/, '平$1波');

  // 处理简化表达式（如"6波" -> "平6波"）
  // 使用从长到短的顺序匹配，避免"一肖位"被错误匹配为"一平肖位"
  // 只替换独立的简化表达式（前面不是"平"或"特"，且后面不是已有的属性尾字）
  const sortedKeys = Object.keys(SIMPLIFIED_EXPRESSIONS).sort((a, b) => b.length - a.length);
  
  for (const simplified of sortedKeys) {
    const standard = SIMPLIFIED_EXPRESSIONS[simplified];
    // 使用负向前瞻和负向后顾，确保不会重复替换已完整的形式
    const pattern = new RegExp(`(?<![平特])${simplified}(?![位头尾合波行号段])`, 'g');
    normalized = normalized.replace(pattern, standard);
  }
  
  // 还原结果类型
  for (let i = 0; i < rtList.length; i++) {
    normalized = normalized.replace(`__TYP${i}__`, rtList[i]);
  }

  return normalized;
}

// 简化表达式映射
const SIMPLIFIED_EXPRESSIONS: Record<string, string> = {
  // 数字+属性 -> 平码
  '1波': '平1波', '2波': '平2波', '3波': '平3波', '4波': '平4波', '5波': '平5波', '6波': '平6波',
  '1头': '平1头', '2头': '平2头', '3头': '平3头', '4头': '平4头', '5头': '平5头', '6头': '平6头',
  '1尾': '平1尾', '2尾': '平2尾', '3尾': '平3尾', '4尾': '平4尾', '5尾': '平5尾', '6尾': '平6尾',
  '1合': '平1合', '2合': '平2合', '3合': '平3合', '4合': '平4合', '5合': '平5合', '6合': '平6合',
  '1号': '平1号', '2号': '平2号', '3号': '平3号', '4号': '平4号', '5号': '平5号', '6号': '平6号',
  '1行': '平1行', '2行': '平2行', '3行': '平3行', '4行': '平4行', '5行': '平5行', '6行': '平6行',
  '1五行': '平1行', '2五行': '平2行', '3五行': '平3行', '4五行': '平4行', '5五行': '平5行', '6五行': '平6行',
  '1段': '平1段', '2段': '平2段', '3段': '平3段', '4段': '平4段', '5段': '平5段', '6段': '平6段',
  '1肖位': '平1肖位', '2肖位': '平2肖位', '3肖位': '平3肖位', '4肖位': '平4肖位', '5肖位': '平5肖位', '6肖位': '平6肖位',
  '1合头': '平1合头', '2合头': '平2合头', '3合头': '平3合头', '4合头': '平4合头', '5合头': '平5合头', '6合头': '平6合头',
  '1合尾': '平1合尾', '2合尾': '平2合尾', '3合尾': '平3合尾', '4合尾': '平4合尾', '5合尾': '平5合尾', '6合尾': '平6合尾',
  
  // 平码简化：平码1=平1号
  '平码1': '平1号', '平码2': '平2号', '平码3': '平3号', '平码4': '平4号', '平码5': '平5号', '平码6': '平6号',
  
  // 中文数字+属性
  '一波': '平1波', '二波': '平2波', '三波': '平3波', '四波': '平4波', '五波': '平5波', '六波': '平6波',
  '一头': '平1头', '二头': '平2头', '三头': '平3头', '四头': '平4头', '五头': '平5头', '六头': '平6头',
  '一尾': '平1尾', '二尾': '平2尾', '三尾': '平3尾', '四尾': '平4尾', '五尾': '平5尾', '六尾': '平6尾',
  '一合': '平1合', '二合': '平2合', '三合': '平3合', '四合': '平4合', '五合': '平5合', '六合': '平6合',
  '一号': '平1号', '二号': '平2号', '三号': '平3号', '四号': '平4号', '五号': '平5号', '六号': '平6号',
  '一行': '平1行', '二行': '平2行', '三行': '平3行', '四行': '平4行', '五行': '平5行', '六行': '平6行',
  '一段': '平1段', '二段': '平2段', '三段': '平3段', '四段': '平4段', '五段': '平5段', '六段': '平6段',
  '一肖位': '平1肖位', '二肖位': '平2肖位', '三肖位': '平3肖位', '四肖位': '平4肖位', '五肖位': '平5肖位', '六肖位': '平6肖位',
  '平一肖': '平1肖位', '平二肖': '平2肖位', '平三肖': '平3肖位', '平四肖': '平4肖位', '平五肖': '平5肖位', '平六肖': '平6肖位',
  '平一肖位': '平1肖位', '平二肖位': '平2肖位', '平三肖位': '平3肖位', '平四肖位': '平4肖位', '平五肖位': '平5肖位', '平六肖位': '平6肖位',
  
  // 特码简化
  '特码头': '特头', '特码尾': '特尾', '特码号': '特号', '特码波': '特波', '特码行': '特行', '特码五行': '特行',
  '特肖': '特肖位',
};

// 83个固定元素定义（包含外部数据）
export const ELEMENT_DEFINITIONS = [
  // 期数系列 (5个)
  '期数', '期数尾', '期数合', '期数合尾', '上期数',
  // 总分系列 (4个)
  '总分', '总分尾', '总分合', '总分合尾',
  // 平码系列 (60个: 6个平码 × 10个属性)
  ...Array.from({ length: 6 }, (_, i) => [
    `平${i + 1}号`, `平${i + 1}头`, `平${i + 1}尾`, `平${i + 1}合`,
    `平${i + 1}合头`, `平${i + 1}合尾`, `平${i + 1}波`, `平${i + 1}段`,
    `平${i + 1}行`, `平${i + 1}肖位`
  ]).flat(),
  // 特码系列 (10个)
  '特号', '特头', '特尾', '特合', '特合头', '特合尾', '特波', '特段', '特行', '特肖位',
  // 外部数据系列 (1个: 星期)
  '星期'
];

// 获取所有可用元素名称
export function getAllElements(): string[] {
  const customElements = getCustomElements().map(e => e.name);
  return [...ELEMENT_DEFINITIONS, ...customElements];
}

// 计算元素值
export function calculateElementValue(
  elementName: string,
  data: LotteryData,
  useSort: boolean,
  prevData?: LotteryData
): number {
  const normalized = normalizeElementName(elementName);
  
  // D规则：平码按大小排序，特码位置不变
  const pingma = useSort ? [...data.numbers.slice(0, 6)].sort((a, b) => a - b) : data.numbers.slice(0, 6);
  const te = data.numbers[6];
  const numbers = [...pingma, te];
  const combinedData = { ...data, numbers };

  // 特殊处理：上期数
  if (normalized === '上期数') {
    if (prevData) {
      return prevData.period % 1000;
    }
    const periodNum = data.period % 1000;
    let prevPeriod = periodNum - 1;
    if (prevPeriod <= 0) prevPeriod = 150;
    return prevPeriod;
  }
  
  return sharedCalculateElementValue(normalized, combinedData);
}

// 获取号码的属性值
function getNumberAttributeValue(num: number, attr: string, zodiacYear?: number): number {
  return sharedCalculateElementValue(`特${attr}`, { numbers: Array(7).fill(num), zodiacYear: zodiacYear || 7, period: 0 });
}

// 检查是否为有效元素
export function isValidElement(name: string): boolean {
  const normalized = normalizeElementName(name);
  return ELEMENT_DEFINITIONS.includes(normalized);
}
