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

// 生肖映射表（2025蛇年）
export const ZODIAC: Record<string, number[]> = {
  蛇: [1, 13, 25, 37, 49],
  龙: [2, 14, 26, 38],
  兔: [3, 15, 27, 39],
  虎: [4, 16, 28, 40],
  牛: [5, 17, 29, 41],
  鼠: [6, 18, 30, 42],
  猪: [7, 19, 31, 43],
  狗: [8, 20, 32, 44],
  鸡: [9, 21, 33, 45],
  猴: [10, 22, 34, 46],
  羊: [11, 23, 35, 47],
  马: [12, 24, 36, 48],
};

// 生肖位置映射：号码 -> 肖位 (1-12)
// 鼠=1, 牛=2, 虎=3, 兔=4, 龙=5, 蛇=6, 马=7, 羊=8, 猴=9, 鸡=10, 狗=11, 猪=12
export function getZodiacPosition(num: number): number {
  if (ZODIAC.鼠.includes(num)) return 1;
  if (ZODIAC.牛.includes(num)) return 2;
  if (ZODIAC.虎.includes(num)) return 3;
  if (ZODIAC.兔.includes(num)) return 4;
  if (ZODIAC.龙.includes(num)) return 5;
  if (ZODIAC.蛇.includes(num)) return 6;
  if (ZODIAC.马.includes(num)) return 7;
  if (ZODIAC.羊.includes(num)) return 8;
  if (ZODIAC.猴.includes(num)) return 9;
  if (ZODIAC.鸡.includes(num)) return 10;
  if (ZODIAC.狗.includes(num)) return 11;
  if (ZODIAC.猪.includes(num)) return 12;
  return 1;
}

// 肖位名称
export function getZodiacName(position: number): string {
  const names = ['', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
  const pos = ((position - 1) % 12) + 1;
  return names[pos] + '位';
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
