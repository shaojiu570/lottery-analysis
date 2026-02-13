import { LotteryData } from '@/types';
import { digitSum, getWaveColor, getFiveElement, getZodiacPosition, getSegment } from './mappings';

// 汉字数字转阿拉伯数字
const CHINESE_NUMBERS: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
};

export function chineseToNumber(str: string): string {
  let result = str;
  // 处理 "二十三" 这种格式
  result = result.replace(/十(\S)/g, (_, d) => `1${CHINESE_NUMBERS[d] || d}`);
  result = result.replace(/(\S)十/g, (_, d) => `${CHINESE_NUMBERS[d] || d}0`);
  result = result.replace(/十/g, '10');
  
  // 替换单个汉字数字
  for (const [cn, num] of Object.entries(CHINESE_NUMBERS)) {
    result = result.replace(new RegExp(cn, 'g'), num.toString());
  }
  return result;
}

// 标准化元素名称
export function normalizeElementName(name: string): string {
  let normalized = chineseToNumber(name);
  
  // 简化格式处理
  // "四五行" -> "平4行"
  normalized = normalized.replace(/^(\d)五行$/, '平$1行');
  // "五肖位" -> "平5肖位"
  normalized = normalized.replace(/^(\d)肖位$/, '平$1肖位');
  // "二波" -> "平2波"
  normalized = normalized.replace(/^(\d)波$/, '平$1波');
  
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
  useSort: boolean // D规则=true, L规则=false
): number {
  const normalized = normalizeElementName(elementName);
  const numbers = useSort ? [...data.numbers].sort((a, b) => a - b) : data.numbers;
  
  // 期数系列
  if (normalized === '期数') return data.period;
  if (normalized === '期数尾') return data.period % 10;
  if (normalized === '期数合') return digitSum(data.period);
  if (normalized === '期数合尾') return digitSum(data.period) % 10;
  
  // 总分系列
  const totalSum = numbers.reduce((sum, n) => sum + n, 0);
  if (normalized === '总分') return totalSum;
  if (normalized === '总分尾') return totalSum % 10;
  if (normalized === '总分合') return digitSum(totalSum);
  if (normalized === '总分合尾') return digitSum(totalSum) % 10;
  
  // 平码系列
  const pingMatch = normalized.match(/^平(\d)(.+)$/);
  if (pingMatch) {
    const index = parseInt(pingMatch[1]) - 1; // 0-5
    const attr = pingMatch[2];
    if (index >= 0 && index < 6) {
      return getNumberAttributeValue(numbers[index], attr);
    }
  }
  
  // 特码系列
  const teMatch = normalized.match(/^特(.+)$/);
  if (teMatch) {
    const attr = teMatch[1];
    return getNumberAttributeValue(numbers[6], attr);
  }
  
  return 0;
}

// 获取号码的属性值
function getNumberAttributeValue(num: number, attr: string): number {
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
      return getZodiacPosition(num);
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
