import { getCustomResultTypes } from './storage';
import * as shared from './workerShared';

// 波色映射表
export const WAVE_COLORS = shared.WAVE_COLORS;

// 波色映射：号码 -> 波色值 (0=红, 1=蓝, 2=绿)
export const getWaveColor = shared.getWaveColor;

// 波色名称
export const getWaveColorName = shared.getWaveColorName || ((value: number) => ['红波', '蓝波', '绿波'][value % 3]);

// 五行映射表 - 默认（马年）
export const FIVE_ELEMENTS = shared.FIVE_ELEMENTS;

// 各生肖年的五行映射
export const FIVE_ELEMENTS_BY_YEAR = shared.FIVE_ELEMENTS_BY_YEAR;

// 获取指定年份的五行映射
function getFiveElementsByYear(zodiacYear?: number) {
  if (zodiacYear && FIVE_ELEMENTS_BY_YEAR[zodiacYear]) {
    return FIVE_ELEMENTS_BY_YEAR[zodiacYear];
  }
  return FIVE_ELEMENTS;
}

// 五行映射：号码 -> 五行值
export const getFiveElement = shared.getFiveElement;

// 五行名称
export function getFiveElementName(value: number): string {
  const names = ['金', '木', '水', '火', '土'];
  return names[value % 5];
}

// 基础生肖号码表
export const BASE_ZODIAC_NUMBERS = shared.BASE_ZODIAC_NUMBERS;

// 生肖名称
export const ZODIAC_NAMES = shared.ZODIAC_NAMES;

// 基准年份：2020年 = 鼠年 = 1
const BASE_YEAR = 2020;

// 农历春节日期表
const SPRING_FESTIVAL_DATES: Record<number, string> = {
  2020: '0125', 2021: '0212', 2022: '0201', 2023: '0122',
  2024: '0210', 2025: '0129', 2026: '0217', 2027: '0206',
  2028: '0126', 2029: '0213', 2030: '0203', 2031: '0122',
};

/**
 * 根据期数计算对应的生肖年份
 */
export const getZodiacYearByPeriod = shared.getZodiacYearByPeriod;

/**
 * 根据年份计算当前生肖索引 (1-12)
 */
export const getZodiacIndexByYear = shared.getZodiacIndexByYear;

/**
 * 获取当前生肖年份名称
 * @param year 年份，不传则使用当前年份
 * @returns 生肖名称
 */
export function getCurrentZodiacYearName(year?: number): string {
  const index = getZodiacIndexByYear(year);
  return ZODIAC_NAMES[index];
}

/**
 * 获取当前年份的动态生肖映射表
 * 逻辑：号码分组固定，生肖标签每年整体前进1位
 * @param zodiacYear 生肖年份索引（1=鼠, 2=牛, ..., 12=猪），不传则使用当前系统年份
 * @returns 生肖名称到号码数组的映射
 */
export function getZodiacMap(zodiacYear?: number): Record<string, number[]> {
  // 如果没有传入生肖年份，使用当前系统年份计算
  // 如果传入的是公历年份（如2026），先转换为生肖索引
  let currentZodiacIndex: number;
  if (zodiacYear === undefined || zodiacYear === null) {
    currentZodiacIndex = getZodiacIndexByYear();
  } else if (zodiacYear > 12) {
    // 传入的是公历年份，转换为生肖索引
    currentZodiacIndex = getZodiacIndexByYear(zodiacYear);
  } else {
    currentZodiacIndex = zodiacYear;
  }
  
  const zodiacMap: Record<string, number[]> = {};
  
  // 号码分组固定（1-12号组），生肖标签每年前进1位
  // 马年（7）：马→1号组, 蛇→2号组, 龙→3号组...
  for (let position = 1; position <= 12; position++) {
    // 计算该位置对应的生肖
    // 位置1的生肖 = 当前年份生肖
    // 位置2的生肖 = 当前年份生肖 - 1（循环）
    const zodiacIndex = ((currentZodiacIndex - position) % 12 + 12) % 12 + 1;
    const zodiacName = ZODIAC_NAMES[zodiacIndex];
    zodiacMap[zodiacName] = BASE_ZODIAC_NUMBERS[position];
  }
  
  return zodiacMap;
}

// 生肖映射表（动态计算，默认当前年份）
export function getZodiac(year?: number): Record<string, number[]> {
  return getZodiacMap(year);
}

// 生肖位置映射：号码 -> 肖位 (1-12)
// 根据生肖年份动态计算
export function getZodiacPosition(num: number, zodiacYear?: number): number {
  const zodiacMap = getZodiacMap(zodiacYear);
  
  for (let i = 1; i <= 12; i++) {
    const zodiacName = ZODIAC_NAMES[i];
    if (zodiacMap[zodiacName]?.includes(num)) {
      return i;
    }
  }
  return 1;
}

// 肖位名称（不带"位"字）
export function getZodiacName(position: number): string {
  const names = ['', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const pos = ((position - 1) % 12) + 1;
  return names[pos];
}

// 根据号码获取生肖名称（使用生肖年份的动态映射）
export function getZodiacNameByNumber(num: number, zodiacYear?: number): string {
  const zodiacMap = getZodiacMap(zodiacYear);
  
  for (const [zodiacName, numbers] of Object.entries(zodiacMap)) {
    if (numbers.includes(num)) {
      return zodiacName;
    }
  }
  return '鼠';  // 默认返回鼠
}

// 生肖名称列表转换为号码列表
// 用于自定义结果类中根据生肖名称自动转换为号码
export function zodiacNamesToNumbers(zodiacNames: string[], zodiacYear?: number): number[] {
  const zodiacMap = getZodiacMap(zodiacYear);
  const result: number[] = [];
  
  for (const name of zodiacNames) {
    const numbers = zodiacMap[name];
    if (numbers) {
      result.push(...numbers);
    }
  }
  
  return [...new Set(result)].sort((a, b) => a - b);
}

// 段位映射：号码 -> 段位 (1-7)
export function getSegment(num: number): number {
  if (num >= 1 && num <= 7) return 1;
  if (num >= 8 && num <= 14) return 2;
  if (num >= 15 && num <= 21) return 3;
  if (num >= 22 && num <= 28) return 4;
  if (num >= 29 && num <= 35) return 5;
  if (num >= 36 && num <= 42) return 6;
  if (num >= 43 && num <= 49) return 7;
  return 1;
}

// 段位名称
export function getSegmentName(value: number): string {
  return `${value}段`;
}

// 大小单双映射
export const BIG_SMALL_ODD_EVEN: Record<string, number[]> = {
  小单: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
  小双: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
  大单: [25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49],
  大双: [26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48],
};

// 大小单双映射：号码 -> 值 (0=小单, 1=小双, 2=大单, 3=大双)
export function getBigSmallOddEven(num: number): number {
  if (BIG_SMALL_ODD_EVEN.小单.includes(num)) return 0;
  if (BIG_SMALL_ODD_EVEN.小双.includes(num)) return 1;
  if (BIG_SMALL_ODD_EVEN.大单.includes(num)) return 2;
  if (BIG_SMALL_ODD_EVEN.大双.includes(num)) return 3;
  return 0;
}

// 大小单双名称
export function getBigSmallOddEvenName(value: number): string {
  const names = ['小单', '小双', '大单', '大双'];
  return names[value % 4];
}

// 结果类型的范围和循环规则
export const RESULT_TYPE_CONFIG = {
  尾数类: { min: 0, max: 9, cycle: 10 },
  头数类: { min: 0, max: 4, cycle: 5 },
  合数类: { min: 1, max: 13, cycle: 13 },
  波色类: { min: 0, max: 2, cycle: 3 },
  五行类: { min: 0, max: 4, cycle: 5 },
  肖位类: { min: 1, max: 12, cycle: 12 },
  单特类: { min: 1, max: 49, cycle: 49 },
  大小单双类: { min: 0, max: 3, cycle: 4 },
};

// 获取所有结果类型（包含自定义）
export function getResultTypeConfig() {
  const customTypes = getCustomResultTypes();
  const config = { ...RESULT_TYPE_CONFIG } as any;
  
  for (const ct of customTypes) {
    const labels = ct.mappings.map(m => m.label);
    config[ct.name] = { min: 0, max: labels.length - 1, cycle: labels.length };
  }
  
  return config;
}

// 应用循环规则
export function applyCycle(value: number, resultType: string): number {
  return shared.applyCycle(value, resultType, getCustomResultTypes());
}

// 获取扩展结果
export function getExpandedResults(
  baseValue: number,
  leftExpand: number,
  rightExpand: number,
  resultType: string
): number[] {
  return shared.getExpandedResults(baseValue, leftExpand, rightExpand, resultType, getCustomResultTypes());
}

// 结果值转文字
export function resultToText(value: number, resultType: string, zodiacYear?: number): string {
  return shared.resultToText(value, resultType, zodiacYear || 7, getCustomResultTypes());
}

// 根据结果类型获取号码属性值
export function getNumberAttribute(num: number, resultType: string, zodiacYear?: number): number {
  return shared.getNumberAttribute(num, resultType, zodiacYear || 7, getCustomResultTypes());
}

// 数字各位之和
export function digitSum(num: number): number {
  return Math.abs(num).toString().split('').reduce((sum, d) => sum + parseInt(d), 0);
}

// 根据结果值获取包含的号码
export function getNumbersByResult(value: number, resultType: string, zodiacYear?: number): number[] {
  const numbers: number[] = [];
  for (let i = 1; i <= 49; i++) {
    if (getNumberAttribute(i, resultType, zodiacYear) === value) {
      numbers.push(i);
    }
  }
  return numbers;
}
