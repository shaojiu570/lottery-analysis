// 波色映射表
export const WAVE_COLORS: Record<string, number[]> = {
  红: [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
  蓝: [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
  绿: [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49],
};

// 波色映射：号码 -> 波色值 (0=红, 1=蓝, 2=绿)
export function getWaveColor(num: number): number {
  if (WAVE_COLORS.红.includes(num)) return 0;
  if (WAVE_COLORS.蓝.includes(num)) return 1;
  if (WAVE_COLORS.绿.includes(num)) return 2;
  return 0;
}

// 波色名称
export function getWaveColorName(value: number): string {
  const names = ['红波', '蓝波', '绿波'];
  return names[value % 3];
}

// 五行映射表
export const FIVE_ELEMENTS: Record<string, number[]> = {
  金: [3, 4, 11, 12, 25, 26, 33, 34, 41, 42],
  木: [7, 8, 15, 16, 23, 24, 37, 38, 45, 46],
  水: [13, 14, 21, 22, 29, 30, 43, 44],
  火: [1, 2, 9, 10, 17, 18, 31, 32, 39, 40, 47, 48],
  土: [5, 6, 19, 20, 27, 28, 35, 36, 49],
};

// 五行映射：号码 -> 五行值 (0=金, 1=木, 2=水, 3=火, 4=土)
export function getFiveElement(num: number): number {
  if (FIVE_ELEMENTS.金.includes(num)) return 0;
  if (FIVE_ELEMENTS.木.includes(num)) return 1;
  if (FIVE_ELEMENTS.水.includes(num)) return 2;
  if (FIVE_ELEMENTS.火.includes(num)) return 3;
  if (FIVE_ELEMENTS.土.includes(num)) return 4;
  return 0;
}

// 五行名称
export function getFiveElementName(value: number): string {
  const names = ['金', '木', '水', '火', '土'];
  return names[value % 5];
}

// 基础生肖号码表（固定不变）
// 鼠=1, 牛=2, 虎=3, 兔=4, 龙=5, 蛇=6, 马=7, 羊=8, 猴=9, 鸡=10, 狗=11, 猪=12
const BASE_ZODIAC_NUMBERS: Record<number, number[]> = {
  1: [1, 13, 25, 37, 49],   // 鼠
  2: [2, 14, 26, 38],       // 牛
  3: [3, 15, 27, 39],       // 虎
  4: [4, 16, 28, 40],       // 兔
  5: [5, 17, 29, 41],       // 龙
  6: [6, 18, 30, 42],       // 蛇
  7: [7, 19, 31, 43],       // 马
  8: [8, 20, 32, 44],       // 羊
  9: [9, 21, 33, 45],       // 猴
  10: [10, 22, 34, 46],     // 鸡
  11: [11, 23, 35, 47],     // 狗
  12: [12, 24, 36, 48],     // 猪
};

// 生肖名称
const ZODIAC_NAMES: Record<number, string> = {
  1: '鼠', 2: '牛', 3: '虎', 4: '兔',
  5: '龙', 6: '蛇', 7: '马', 8: '羊',
  9: '猴', 10: '鸡', 11: '狗', 12: '猪'
};

// 基准年份：2020年 = 鼠年 = 1
const BASE_YEAR = 2020;
const BASE_ZODIAC_INDEX = 1;

/**
 * 根据年份计算当前生肖索引 (1-12)
 * @param year 年份，不传则使用当前年份
 * @returns 生肖索引 1=鼠, 2=牛, ..., 12=猪
 */
export function getZodiacIndexByYear(year?: number): number {
  const targetYear = year || new Date().getFullYear();
  const diff = targetYear - BASE_YEAR;
  return ((diff % 12) + 12) % 12 + 1;
}

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
 * @param year 年份，不传则使用当前年份
 * @returns 生肖名称到号码数组的映射
 */
export function getZodiacMap(year?: number): Record<string, number[]> {
  const currentZodiacIndex = getZodiacIndexByYear(year);
  const zodiacMap: Record<string, number[]> = {};
  
  // 根据当前生肖年重新映射
  for (let i = 0; i < 12; i++) {
    const zodiacIndex = ((currentZodiacIndex - 1 + i) % 12) + 1;
    const zodiacName = ZODIAC_NAMES[zodiacIndex];
    // 基础号码表按顺序循环
    const baseIndex = ((i) % 12) + 1;
    zodiacMap[zodiacName] = BASE_ZODIAC_NUMBERS[baseIndex];
  }
  
  return zodiacMap;
}

// 生肖映射表（动态计算，默认当前年份）
export function getZodiac(year?: number): Record<string, number[]> {
  return getZodiacMap(year);
}

// 生肖位置映射：号码 -> 肖位 (1-12)
// 根据当前年份动态计算
export function getZodiacPosition(num: number, year?: number): number {
  const zodiacMap = getZodiacMap(year);
  
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

// 结果类型的范围和循环规则
export const RESULT_TYPE_CONFIG = {
  尾数类: { min: 0, max: 9, cycle: 10 },
  头数类: { min: 0, max: 4, cycle: 5 },
  合数类: { min: 0, max: 13, cycle: 14 },
  波色类: { min: 0, max: 2, cycle: 3 },
  五行类: { min: 0, max: 4, cycle: 5 },
  肖位类: { min: 1, max: 12, cycle: 12 },
  单特类: { min: 1, max: 49, cycle: 49 },
};

// 应用循环规则
export function applyCycle(value: number, resultType: keyof typeof RESULT_TYPE_CONFIG): number {
  const config = RESULT_TYPE_CONFIG[resultType];
  if (resultType === '肖位类' || resultType === '单特类') {
    // 1-based 循环
    return ((value - 1) % config.cycle + config.cycle) % config.cycle + 1;
  }
  // 0-based 循环
  return ((value % config.cycle) + config.cycle) % config.cycle;
}

// 获取扩展结果
export function getExpandedResults(
  baseValue: number,
  leftExpand: number,
  rightExpand: number,
  resultType: keyof typeof RESULT_TYPE_CONFIG
): number[] {
  const results: number[] = [];
  
  for (let i = -leftExpand; i <= rightExpand; i++) {
    const value = baseValue + i;
    const cycledValue = applyCycle(value, resultType);
    if (!results.includes(cycledValue)) {
      results.push(cycledValue);
    }
  }
  
  return results.sort((a, b) => a - b);
}

// 结果值转文字
export function resultToText(value: number, resultType: keyof typeof RESULT_TYPE_CONFIG): string {
  switch (resultType) {
    case '尾数类':
      return `${value}尾`;
    case '头数类':
      return `${value}头`;
    case '合数类':
      return `${value}合`;
    case '波色类':
      return getWaveColorName(value);
    case '五行类':
      return getFiveElementName(value);
    case '肖位类':
      return getZodiacName(value);
    case '单特类':
      return value.toString().padStart(2, '0');
    default:
      return value.toString();
  }
}

// 根据结果类型获取号码属性值
export function getNumberAttribute(num: number, resultType: keyof typeof RESULT_TYPE_CONFIG): number {
  switch (resultType) {
    case '尾数类':
      return num % 10;
    case '头数类':
      return Math.floor(num / 10);
    case '合数类':
      return digitSum(num);
    case '波色类':
      return getWaveColor(num);
    case '五行类':
      return getFiveElement(num);
    case '肖位类':
      return getZodiacPosition(num);
    case '单特类':
      return num;
    default:
      return num;
  }
}

// 数字各位之和
export function digitSum(num: number): number {
  return Math.abs(num).toString().split('').reduce((sum, d) => sum + parseInt(d), 0);
}

// 根据结果值获取包含的号码
export function getNumbersByResult(value: number, resultType: keyof typeof RESULT_TYPE_CONFIG): number[] {
  const numbers: number[] = [];
  for (let i = 1; i <= 49; i++) {
    if (getNumberAttribute(i, resultType) === value) {
      numbers.push(i);
    }
  }
  return numbers;
}
