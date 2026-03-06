import { LotteryData, CustomResultType, CustomElement } from '@/types';

export interface VerifyResult {
  formula: {
    rule: string;
    resultType: string;
    expression: string;
    offset: number;
    periods: number;
    leftExpand: number;
    rightExpand: number;
  };
  hits: boolean[];
  hitCount: number;
  totalPeriods: number;
  hitRate: number;
  results: string[];
  periodResults: Array<{
    period: number;
    result: number;
    expandedResults: number[];
    targetValue: number;
    hit: boolean;
  }>;
  targetPeriod: number | null;
}

export function verifyFormula(
  parsed: any,
  historyData: LotteryData[],
  targetPeriod: number | null,
  periods: number,
  leftExpand: number,
  rightExpand: number,
  offset: number,
  customElements: CustomElement[],
  customResultTypes: CustomResultType[],
  precomputedMap: Map<number, PrecomputedData[]>
): VerifyResult {
  const periodResults = [];
  const hits = [];
  const useSort = parsed.rule === 'D';
  
  // 确定验证范围
  let dataToVerify: LotteryData[] = [];
  // startIdx 用于在计算target对应的下一期时定位历史数组索引
  let startIdx = 0;
  if (targetPeriod) {
    const idx = historyData.findIndex(d => d.period === targetPeriod);
    if (idx !== -1) {
      // 回溯验证时只使用目标期之前的数据（上一期及其前面的几期）
      // 比如验证062期时，periods=1应该只取061期用于计算。
      startIdx = Math.max(0, idx - periods);
      dataToVerify = historyData.slice(startIdx, idx);
    }
  } else {
    // 没有指定目标期时保留原来的行为
    dataToVerify = historyData.slice(0, periods);
  }
  
  // 根据是否指定了targetPeriod, 如果需要将预测值与下一期的数据比较
  for (let i = 0; i < dataToVerify.length; i++) {
    const verifyData = dataToVerify[i];
    const cache = precomputedMap.get(verifyData.period)?.find(p => p.useSort === useSort)?.elementValues;
    const rawResult = evaluateExpression(parsed.expression, verifyData, useSort, customElements, cache);
    const withOffset = rawResult + offset;

    const cycledResult = applyCycle(withOffset, parsed.resultType, customResultTypes);
    const expandedResults = getExpandedResults(cycledResult, leftExpand, rightExpand, parsed.resultType, customResultTypes);

    let targetValue: number;
    let hit: boolean;

    if (targetPeriod) {
      // 目标期存在时，用当前条目的下一期作为真实值
      const actualData = historyData[startIdx + i + 1];
      // 如果下一期不存在（可能回溯范围不足），则默认未命中且targetValue为NaN
      if (actualData) {
        targetValue = getNumberAttribute(actualData.numbers[6], parsed.resultType, actualData.zodiacYear, customResultTypes);
        hit = expandedResults.includes(targetValue);
      } else {
        targetValue = NaN;
        hit = false;
      }
    } else {
      // 未指定目标期时保持原有行为：与本期比较
      targetValue = getNumberAttribute(verifyData.numbers[6], parsed.resultType, verifyData.zodiacYear, customResultTypes);
      hit = expandedResults.includes(targetValue);
    }

    periodResults.push({
      period: verifyData.period,
      result: cycledResult,
      expandedResults,
      targetValue,
      hit,
    });
    hits.push(hit);
  }
  
  const hitCount = hits.filter(h => h).length;
  
  // 确定显示用的结果集合
  let latestResultsForSummary: number[] = [];
  if (targetPeriod) {
    // 预测或回溯有目标期时，summary使用最后一次计算的 expandedResults
    if (periodResults.length > 0) {
      latestResultsForSummary = periodResults[periodResults.length - 1].expandedResults;
    } else {
      latestResultsForSummary = [];
    }
  } else {
    const calcData = historyData[0];
    if (calcData) {
      const cache = precomputedMap.get(calcData.period)?.find(p => p.useSort === useSort)?.elementValues;
      const rawResult = evaluateExpression(parsed.expression, calcData, useSort, customElements, cache);
      const cycledResult = applyCycle(rawResult + offset, parsed.resultType, customResultTypes);
      latestResultsForSummary = getExpandedResults(cycledResult, leftExpand, rightExpand, parsed.resultType, customResultTypes);
    }
  }

  // 为 UI 保持原始顺序（最新在后）或按 UI 期望的反转
  // 注意：hits.reverse() 会影响后续使用，所以我们先克隆或直接在返回时处理
  const hitsForReturn = [...hits].reverse();
  const periodResultsForReturn = [...periodResults].reverse();
  
  const results = Array.from(latestResultsForSummary).sort((a, b) => a - b).map(v => resultToText(v, parsed.resultType, 7, customResultTypes));
  
  return {
    formula: parsed,
    hits: hitsForReturn,
    hitCount,
    totalPeriods: hits.length,
    hitRate: hits.length > 0 ? hitCount / hits.length : 0,
    results,
    periodResults: periodResultsForReturn,
    targetPeriod,
  };
}

// 汉字数字转阿拉伯数字
const CHINESE_NUMBERS: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
};

export function chineseToNumber(str: string): string {
  let result = str;
  result = result.replace(/十([一二三四五六七八九])/g, (_, d) => `1${CHINESE_NUMBERS[d]}`);
  result = result.replace(/([一二三四五六七八九])十([一二三四五六七八九]?)/g, (_, tens, ones) => {
    const tenVal = CHINESE_NUMBERS[tens];
    const oneVal = ones ? CHINESE_NUMBERS[ones] : 0;
    return (tenVal * 10 + oneVal).toString();
  });
  result = result.replace(/^十/g, '10');
  result = result.replace(/([^\d])十/g, '$110');
  for (const [cn, num] of Object.entries(CHINESE_NUMBERS)) {
    result = result.replace(new RegExp(cn, 'g'), num.toString());
  }
  return result;
}

// ==================== 基础常量 ====================

export const WAVE_COLORS: Record<string, number[]> = {
  红: [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
  蓝: [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
  绿: [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49],
};

export const FIVE_ELEMENTS: Record<string, number[]> = {
  金: [4, 5, 12, 13, 26, 27, 34, 35, 42, 43],
  木: [8, 9, 16, 17, 24, 25, 38, 39, 46, 47],
  水: [1, 14, 15, 22, 23, 30, 31, 44, 45],
  火: [2, 3, 10, 11, 18, 19, 32, 33, 40, 41, 48, 49],
  土: [6, 7, 20, 21, 28, 29, 36, 37],
};

export const FIVE_ELEMENTS_BY_YEAR: Record<number, Record<string, number[]>> = {
  6: {
    金: [3, 4, 11, 12, 25, 26, 33, 34, 41, 42],
    木: [7, 8, 15, 16, 23, 24, 37, 38, 45, 46],
    水: [13, 14, 21, 22, 29, 30, 43, 44],
    火: [1, 2, 9, 10, 17, 18, 31, 32, 39, 40, 47, 48],
    土: [5, 6, 19, 20, 27, 28, 35, 36, 49],
  },
  7: {
    金: [4, 5, 12, 13, 26, 27, 34, 35, 42, 43],
    木: [8, 9, 16, 17, 24, 25, 38, 39, 46, 47],
    水: [1, 14, 15, 22, 23, 30, 31, 44, 45],
    火: [2, 3, 10, 11, 18, 19, 32, 33, 40, 41, 48, 49],
    土: [6, 7, 20, 21, 28, 29, 36, 37],
  },
};

export const BASE_ZODIAC_NUMBERS: Record<number, number[]> = {
  1: [1, 13, 25, 37, 49],
  2: [2, 14, 26, 38],
  3: [3, 15, 27, 39],
  4: [4, 16, 28, 40],
  5: [5, 17, 29, 41],
  6: [6, 18, 30, 42],
  7: [7, 19, 31, 43],
  8: [8, 20, 32, 44],
  9: [9, 21, 33, 45],
  10: [10, 22, 34, 46],
  11: [11, 23, 35, 47],
  12: [12, 24, 36, 48],
};

export const ZODIAC_NAMES: Record<number, string> = {
  1: '鼠', 2: '牛', 3: '虎', 4: '兔',
  5: '龙', 6: '蛇', 7: '马', 8: '羊',
  9: '猴', 10: '鸡', 11: '狗', 12: '猪'
};

export const BIG_SMALL_ODD_EVEN: Record<string, number[]> = {
  小单: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
  小双: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
  大单: [25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49],
  大双: [26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48],
};

export interface PrecomputedData {
  period: number;
  useSort: boolean;
  elementValues: Record<string, number>;
}

export function precomputeAllElementValues(historyData: LotteryData[]): Map<number, PrecomputedData[]> {
  const map = new Map<number, PrecomputedData[]>();
  
  for (const data of historyData) {
    const elementValuesD: Record<string, number> = {};
    const elementValuesL: Record<string, number> = {};
    
    const pingmaD = [...data.numbers.slice(0, 6)].sort((a, b) => a - b);
    const pingmaL = data.numbers.slice(0, 6);
    const teNum = data.numbers[6];
    const totalD = [...pingmaD, teNum].reduce((s, n) => s + n, 0);
    const totalL = [...pingmaL, teNum].reduce((s, n) => s + n, 0);
    const periodNum = data.period % 1000;
    
    // 期数系列
    elementValuesD['期数'] = periodNum;
    elementValuesD['期数尾'] = periodNum % 10;
    elementValuesD['期数合'] = digitSum(periodNum);
    elementValuesD['期数合尾'] = digitSum(periodNum) % 10;
    
    // 上期数
    const prevIdx = historyData.indexOf(data) + 1;
    if (prevIdx < historyData.length) {
      elementValuesD['上期数'] = historyData[prevIdx].period % 1000;
    } else {
      let prevPeriod = periodNum - 1;
      if (prevPeriod <= 0) prevPeriod = 150;
      elementValuesD['上期数'] = prevPeriod;
    }
    Object.assign(elementValuesL, elementValuesD);
    
    // 总分系列
    elementValuesD['总分'] = totalD;
    elementValuesD['总分尾'] = totalD % 10;
    elementValuesD['总分合'] = digitSum(totalD);
    elementValuesD['总分合尾'] = digitSum(totalD) % 10;
    elementValuesL['总分'] = totalL;
    elementValuesL['总分尾'] = totalL % 10;
    elementValuesL['总分合'] = digitSum(totalL);
    elementValuesL['总分合尾'] = digitSum(totalL) % 10;
    
    // 平码系列
    for (let i = 0; i < 6; i++) {
      const numD = pingmaD[i];
      const numL = pingmaL[i];
      const attrs = ['号', '头', '尾', '合', '波', '段', '行', '肖位'];
      attrs.forEach(attr => {
        const elem = `平${i + 1}${attr}`;
        elementValuesD[elem] = getNumberAttributeValue(numD, attr, data.zodiacYear);
        elementValuesL[elem] = getNumberAttributeValue(numL, attr, data.zodiacYear);
      });
      elementValuesD[`平${i + 1}合头`] = Math.floor(elementValuesD[`平${i + 1}合`] / 10);
      elementValuesD[`平${i + 1}合尾`] = elementValuesD[`平${i + 1}合`] % 10;
      elementValuesL[`平${i + 1}合头`] = Math.floor(elementValuesL[`平${i + 1}合`] / 10);
      elementValuesL[`平${i + 1}合尾`] = elementValuesL[`平${i + 1}合`] % 10;
    }
    
    // 特码系列
    const teAttrs = ['号', '头', '尾', '合', '波', '段', '行', '肖位'];
    teAttrs.forEach(attr => {
      elementValuesD[`特${attr}`] = getNumberAttributeValue(teNum, attr, data.zodiacYear);
      elementValuesL[`特${attr}`] = elementValuesD[`特${attr}`];
    });
    elementValuesD['特合头'] = Math.floor(elementValuesD['特合'] / 10);
    elementValuesD['特合尾'] = elementValuesD['特合'] % 10;
    elementValuesL['特合头'] = elementValuesD['特合头'];
    elementValuesL['特合尾'] = elementValuesD['特合尾'];
    
    map.set(data.period, [
      { period: data.period, useSort: true, elementValues: elementValuesD },
      { period: data.period, useSort: false, elementValues: elementValuesL }
    ]);
  }
  return map;
}

// ==================== 基础函数 ====================

export function digitSum(n: number): number {
  return Math.abs(n).toString().split('').reduce((s, d) => s + parseInt(d), 0);
}

export function getWaveColor(num: number): number {
  if (WAVE_COLORS.红.includes(num)) return 0;
  if (WAVE_COLORS.蓝.includes(num)) return 1;
  if (WAVE_COLORS.绿.includes(num)) return 2;
  return 0;
}

export function getFiveElement(num: number, zodiacYear?: number): number {
  const elements = (zodiacYear && FIVE_ELEMENTS_BY_YEAR[zodiacYear]) || FIVE_ELEMENTS;
  if (elements.金.includes(num)) return 0;
  if (elements.木.includes(num)) return 1;
  if (elements.水.includes(num)) return 2;
  if (elements.火.includes(num)) return 3;
  if (elements.土.includes(num)) return 4;
  return 0;
}

export function getZodiacPosition(num: number, zodiacYear: number): number {
  for (let position = 1; position <= 12; position++) {
    if (BASE_ZODIAC_NUMBERS[position].includes(num)) {
      // position 1 对应 zodiacYear
      // position 2 对应 zodiacYear - 1
      const zodiacIndex = ((zodiacYear - position) % 12 + 12) % 12 + 1;
      // 我们返回的是生肖的原始位置（1-12）
      return zodiacIndex;
    }
  }
  return 1;
}

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

export function getBigSmallOddEven(num: number): number {
  if (BIG_SMALL_ODD_EVEN.小单.includes(num)) return 0;
  if (BIG_SMALL_ODD_EVEN.小双.includes(num)) return 1;
  if (BIG_SMALL_ODD_EVEN.大单.includes(num)) return 2;
  if (BIG_SMALL_ODD_EVEN.大双.includes(num)) return 3;
  return 0;
}

export function calculateElementValue(name: string, data: LotteryData): number {
  const numbers = data.numbers;
  const periodNum = data.period % 1000;
  
  if (name === '期数') return periodNum;
  if (name === '期数尾') return periodNum % 10;
  if (name === '期数合') return digitSum(periodNum);
  if (name === '期数合尾') return digitSum(periodNum) % 10;
  
  if (name === '星期') return data.weekDay || 0;
  if (name === '干') {
    const ganzhi = data.ganzhi || '甲子';
    return '甲乙丙丁戊己庚辛壬癸'.indexOf(ganzhi[0]);
  }
  if (name === '支') {
    const ganzhi = data.ganzhi || '甲子';
    return '子丑寅卯辰巳午未申酉戌亥'.indexOf(ganzhi[1]);
  }
  if (name === '干支') {
    const ganzhi = data.ganzhi || '甲子';
    const stemIndex = '甲乙丙丁戊己庚辛壬癸'.indexOf(ganzhi[0]);
    const branchIndex = '子丑寅卯辰巳午未申酉戌亥'.indexOf(ganzhi[1]);
    return stemIndex + branchIndex * 10;
  }
  
  const totalSum = numbers.reduce((sum, n) => sum + n, 0);
  if (name === '总分') return totalSum;
  if (name === '总分尾') return totalSum % 10;
  if (name === '总分合') return digitSum(totalSum);
  if (name === '总分合尾') return digitSum(totalSum) % 10;
  
  const pingMatch = name.match(/^平(\d)(.+)$/);
  if (pingMatch) {
    const index = parseInt(pingMatch[1]) - 1;
    const attr = pingMatch[2];
    if (index >= 0 && index < 6) {
      return getNumberAttributeValue(numbers[index], attr, data.zodiacYear);
    }
  }
  
  const teMatch = name.match(/^特(.+)$/);
  if (teMatch) {
    const attr = teMatch[1];
    return getNumberAttributeValue(numbers[6], attr, data.zodiacYear);
  }
  
  return 0;
}

export function getNumberAttributeValue(num: number, attr: string, zodiacYear: number): number {
  switch (attr) {
    case '号': return num;
    case '头': return Math.floor(num / 10);
    case '尾': return num % 10;
    case '合': return digitSum(num);
    case '合头': return Math.floor(digitSum(num) / 10);
    case '合尾': return digitSum(num) % 10;
    case '波': return getWaveColor(num);
    case '段': return getSegment(num);
    case '行': return getFiveElement(num, zodiacYear);
    case '肖位': return getZodiacPosition(num, zodiacYear);
    default: return num;
  }
}

// 处理自定义元素：将自定义元素名称替换为它们的公式
export function resolveCustomElements(expression: string, customElements: CustomElement[], depth = 0): string {
  if (depth > 5) return expression; // 限制递归深度，防止无限循环
  if (customElements.length === 0) return expression;
  
  let resolved = expression;
  // 按名称长度降序排列，避免子串匹配问题
  const sortedCustom = [...customElements].sort((a, b) => b.name.length - a.name.length);
  
  for (const ce of sortedCustom) {
    if (resolved.includes(ce.name)) {
      const regex = new RegExp(ce.name, 'g');
      resolved = resolved.replace(regex, `(${ce.expression})`);
    }
  }
  
  const hasMore = sortedCustom.some(ce => resolved.includes(ce.name));
  if (hasMore) {
    return resolveCustomElements(resolved, customElements, depth + 1);
  }
  
  return resolved;
}

// 计算表达式
export function evaluateExpression(
  expression: string,
  data: LotteryData,
  useSort: boolean,
  customElements: CustomElement[],
  elementValueCache?: Record<string, number>
): number {
  // 1. 先解析自定义元素
  let resolvedExpr = resolveCustomElements(expression, customElements);
  
  // 2. 标准化 (Worker中使用chineseToNumber, 主线程使用normalizeElementName)
  // 这里我们假设传入的expression已经部分标准化，或者我们在这里做基础转换
  let normalized = chineseToNumber(resolvedExpr);
  
  // 3. 替换元素为数值
  // 我们使用一个正则来匹配可能的元素名称
  // 注意：这个逻辑需要非常小心，主线程中使用的是更复杂的正则
  
  // 如果有缓存，优先使用缓存
  if (elementValueCache) {
    // 按长度降序替换，避免子串问题
    const sortedKeys = Object.keys(elementValueCache).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (normalized.includes(key)) {
        normalized = normalized.split(key).join(elementValueCache[key].toString());
      }
    }
  } else {
    // 动态计算（较慢）
    // 这种情况下我们需要知道所有可能的元素名称，或者递归解析
    // 这里简单处理：目前公式解析后通常只剩下标准元素名
  }
  
  // 4. 清理并计算
  normalized = normalized.replace(/[×\*]/g, '*').replace(/[÷\/]/g, '/');
  
  try {
    // 移除不安全字符
    const safeExpr = normalized.replace(/[^\d+\-*/().\s]/g, '');
    if (!safeExpr.trim()) return 0;
    // eslint-disable-next-line no-eval
    return Math.floor(eval(safeExpr));
  } catch (e) {
    return 0;
  }
}

export function getNumberAttribute(num: number, resultType: string, zodiacYear: number, customTypes: CustomResultType[] = []): number {
  switch (resultType) {
    case '尾数类': return num % 10;
    case '头数类': return Math.floor(num / 10);
    case '合数类': return digitSum(num);
    case '波色类': return getWaveColor(num);
    case '五行类': return getFiveElement(num, zodiacYear);
    case '肖位类': return getZodiacPosition(num, zodiacYear);
    case '单特类': return num;
    case '大小单双类': return getBigSmallOddEven(num);
    default:
      const ct = customTypes.find(t => t.name === resultType);
      if (ct) {
        for (let i = 0; i < ct.mappings.length; i++) {
          if (ct.mappings[i].values.includes(num)) return i;
        }
      }
      return num;
  }
}

export function applyCycle(value: number, resultType: string, customTypes: CustomResultType[] = []): number {
  const BUILTIN_CONFIG: Record<string, { cycle: number }> = {
    尾数类: { cycle: 10 },
    头数类: { cycle: 5 },
    合数类: { cycle: 13 },
    波色类: { cycle: 3 },
    五行类: { cycle: 5 },
    肖位类: { cycle: 12 },
    单特类: { cycle: 49 },
    大小单双类: { cycle: 4 },
  };

  let cycle = 10;
  if (BUILTIN_CONFIG[resultType]) {
    cycle = BUILTIN_CONFIG[resultType].cycle;
  } else {
    const ct = customTypes.find(t => t.name === resultType);
    if (ct) cycle = ct.mappings.length;
  }

  if (resultType === '肖位类' || resultType === '单特类' || resultType === '合数类') {
    return ((value - 1) % cycle + cycle) % cycle + 1;
  }
  return ((value % cycle) + cycle) % cycle;
}

export function getExpandedResults(baseValue: number, leftExpand: number, rightExpand: number, resultType: string, customTypes: CustomResultType[] = []): number[] {
  const results: number[] = [];
  for (let i = -leftExpand; i <= rightExpand; i++) {
    const cycledValue = applyCycle(baseValue + i, resultType, customTypes);
    if (!results.includes(cycledValue)) results.push(cycledValue);
  }
  return results.sort((a, b) => a - b);
}

export function getWaveColorName(value: number): string {
  const names = ['红波', '蓝波', '绿波'];
  return names[value % 3];
}

export function getFiveElementName(value: number): string {
  const names = ['金', '木', '水', '火', '土'];
  return names[value % 5];
}

export function getZodiacName(position: number): string {
  const pos = ((position - 1) % 12) + 1;
  return ZODIAC_NAMES[pos] || '鼠';
}

export function resultToText(value: number, resultType: string, zodiacYear: number, customTypes: CustomResultType[] = []): string {
  switch (resultType) {
    case '尾数类': return `${value}尾`;
    case '头数类': return `${value}头`;
    case '合数类': return `${value}合`;
    case '波色类': return getWaveColorName(value);
    case '五行类': return getFiveElementName(value);
    case '肖位类': return getZodiacName(value);
    case '单特类': return value.toString().padStart(2, '0');
    case '大小单双类': return ['小单', '小双', '大单', '大双'][value % 4];
    default:
      const ct = customTypes.find(t => t.name === resultType);
      if (ct) return ct.mappings[value % ct.mappings.length]?.label || value.toString();
      return value.toString();
  }
}
