import { LotteryData } from '@/types';
import { digitSum, getWaveColor, getFiveElement, getZodiacPosition, getSegment } from './mappings';

// 汉字数字转阿拉伯数字
const CHINESE_NUMBERS: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
};

export function chineseToNumber(str: string): string {
  let result = str;
  
  // 处理 "十一" 到 "十九" (11-19)
  result = result.replace(/十([一二三四五六七八九])/g, (_, d) => `1${CHINESE_NUMBERS[d]}`);
  
  // 处理 "二十一" 到 "九十九" (21-99)
  result = result.replace(/([一二三四五六七八九])十([一二三四五六七八九]?)/g, (_, tens, ones) => {
    const tenVal = CHINESE_NUMBERS[tens];
    const oneVal = ones ? CHINESE_NUMBERS[ones] : 0;
    return (tenVal * 10 + oneVal).toString();
  });
  
  // 处理 "十" 开头 (10-19 的另一种表示)
  result = result.replace(/^十/g, '10');
  result = result.replace(/([^\d])十/g, '$110');
  
  // 替换单个汉字数字
  for (const [cn, num] of Object.entries(CHINESE_NUMBERS)) {
    result = result.replace(new RegExp(cn, 'g'), num.toString());
  }
  return result;
}

// 元素别名映射表
const ELEMENT_ALIASES: Record<string, string> = {
  // 特码相关
  '特码': '特',
  '特号': '特',
  '特': '特',
  // 平码相关 - 支持"平六波"、"平6波"
  '平一': '平1',
  '平二': '平2',
  '平三': '平3',
  '平四': '平4',
  '平五': '平5',
  '平六': '平6',
  // 总分相关
  '总分数': '总分',
  '总分合': '总分合',
  '总分尾': '总分尾',
  // 期数相关
  '期数合': '期数合',
  '期数尾': '期数尾',
  '期数合尾': '期数合尾',
};

// 标准化元素名称
export function normalizeElementName(name: string): string {
  let normalized = chineseToNumber(name);
  
  // 处理别名（如"特码波" -> "特波"）
  for (const [alias, standard] of Object.entries(ELEMENT_ALIASES)) {
    normalized = normalized.replace(new RegExp(alias, 'g'), standard);
  }
  
  // 简化格式处理
  // "四五行" -> "平4行"
  normalized = normalized.replace(/^(\d)五行$/, '平$1行');
  // "五肖位" -> "平5肖位"
  normalized = normalized.replace(/^(\d)肖位$/, '平$1肖位');
  // "二波" -> "平2波"
  normalized = normalized.replace(/^(\d)波$/, '平$1波');
  // "平六波" -> "平6波"（处理中文数字）
  normalized = normalized.replace(/平([一二三四五六])/, (_, cn) => {
    const map: Record<string, string> = { '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6' };
    return '平' + (map[cn] || cn);
  });
  
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
  '1段': '平1段', '2段': '平2段', '3段': '平3段', '4段': '平4段', '5段': '平5段', '6段': '平6段',
  '1肖位': '平1肖位', '2肖位': '平2肖位', '3肖位': '平3肖位', '4肖位': '平4肖位', '5肖位': '平5肖位', '6肖位': '平6肖位',
  
  // 中文数字+属性
  '一波': '平1波', '二波': '平2波', '三波': '平3波', '四波': '平4波', '五波': '平5波', '六波': '平6波',
  '一头': '平1头', '二头': '平2头', '三头': '平3头', '四头': '平4头', '五头': '平5头', '六头': '平6头',
  '一尾': '平1尾', '二尾': '平2尾', '三尾': '平3尾', '四尾': '平4尾', '五尾': '平5尾', '六尾': '平6尾',
  '一合': '平1合', '二合': '平2合', '三合': '平3合', '四合': '平4合', '五合': '平5合', '六合': '平6合',
  '一号': '平1号', '二号': '平2号', '三号': '平3号', '四号': '平4号', '五号': '平5号', '六号': '平6号',
  '一行': '平1行', '二行': '平2行', '三行': '平3行', '四行': '平4行', '五行': '平5行', '六行': '平6行',
  '一段': '平1段', '二段': '平2段', '三段': '平3段', '四段': '平4段', '五段': '平5段', '六段': '平6段',
  '一肖位': '平1肖位', '二肖位': '平2肖位', '三肖位': '平3肖位', '四肖位': '平4肖位', '五肖位': '平5肖位', '六肖位': '平6肖位',
};

// 扩展表达式标准化函数
export function normalizeSimplifiedExpression(expression: string): string {
  let normalized = chineseToNumber(expression);
  
  // 处理简化表达式（如"6波" -> "平6波"）
  // 使用从长到短的顺序匹配，避免"一肖位"被错误匹配为"一平肖位"
  // 只替换独立的简化表达式（前面不是"平"或"特"）
  const sortedKeys = Object.keys(SIMPLIFIED_EXPRESSIONS).sort((a, b) => b.length - a.length);
  
  for (const simplified of sortedKeys) {
    const standard = SIMPLIFIED_EXPRESSIONS[simplified];
    // 使用负向前瞻，确保前面不是"平"或"特"
    const pattern = new RegExp(`(?<![平特])${simplified}`, 'g');
    normalized = normalized.replace(pattern, standard);
  }
  
  return normalized;
}

// 78个固定元素定义
export const ELEMENT_DEFINITIONS = [
  // 期数系列 (4个)
  '期数', '期数尾', '期数合', '期数合尾',
  // 总分系列 (4个)
  '总分', '总分尾', '总分合', '总分合尾',
  // 平码系列 (60个)
  ...Array.from({ length: 6 }, (_, i) => [
    `平${i + 1}号`, `平${i + 1}头`, `平${i + 1}尾`, `平${i + 1}合`,
    `平${i + 1}合头`, `平${i + 1}合尾`, `平${i + 1}波`, `平${i + 1}段`,
    `平${i + 1}行`, `平${i + 1}肖位`
  ]).flat(),
  // 特码系列 (10个)
  '特号', '特头', '特尾', '特合', '特合头', '特合尾', '特波', '特段', '特行', '特肖位'
];

// 计算元素值
export function calculateElementValue(
  elementName: string,
  data: LotteryData,
  useSort: boolean
): number {
  const normalized = normalizeElementName(elementName);
  const numbers = useSort ? [...data.numbers].sort((a, b) => a - b) : data.numbers;
  
  // 期数系列 - 只取后3位计算
  const periodNum = data.period % 1000;
  if (normalized === '期数') return periodNum;
  if (normalized === '期数尾') return periodNum % 10;
  if (normalized === '期数合') return digitSum(periodNum);
  if (normalized === '期数合尾') return digitSum(periodNum) % 10;
  
  // 总分系列
  const totalSum = numbers.reduce((sum, n) => sum + n, 0);
  if (normalized === '总分') return totalSum;
  if (normalized === '总分尾') return totalSum % 10;
  if (normalized === '总分合') return digitSum(totalSum);
  if (normalized === '总分合尾') return digitSum(totalSum) % 10;
  
  // 平码系列
  const pingMatch = normalized.match(/^平(\d)(.+)$/);
  if (pingMatch) {
    const index = parseInt(pingMatch[1]) - 1;
    const attr = pingMatch[2];
    if (index >= 0 && index < 6) {
      return getNumberAttributeValue(numbers[index], attr, data.zodiacYear);
    }
  }
  
  // 特码系列
  const teMatch = normalized.match(/^特(.+)$/);
  if (teMatch) {
    const attr = teMatch[1];
    return getNumberAttributeValue(numbers[6], attr, data.zodiacYear);
  }
  
  return 0;
}

// 获取号码的属性值
function getNumberAttributeValue(num: number, attr: string, zodiacYear?: number): number {
  switch (attr) {
    case '号':
      return num;
    case '头':
      return Math.floor(num / 10);
    case '尾':
      return num % 10;
    case '合':
      return digitSum(num);
    case '合头':
      return Math.floor(digitSum(num) / 10);
    case '合尾':
      return digitSum(num) % 10;
    case '波':
      return getWaveColor(num);
    case '段':
      return getSegment(num);
    case '行':
      return getFiveElement(num);
    case '肖位':
      return getZodiacPosition(num, zodiacYear);
    default:
      return num;
  }
}

// 检查是否为有效元素
export function isValidElement(name: string): boolean {
  const normalized = normalizeElementName(name);
  return ELEMENT_DEFINITIONS.includes(normalized);
}

// 获取所有元素名称（用于搜索）
export function getAllElements(): string[] {
  return [...ELEMENT_DEFINITIONS];
}
