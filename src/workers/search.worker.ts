// 智能搜索 Worker - 将计算移到后台线程
import type { LotteryData, ResultType } from '../types';

// ==================== 缓存机制 ====================
// 元素值缓存 - 避免重复计算相同元素
const elementCache = new Map<string, Map<number, number>>();

// 波色映射
const WAVE_COLORS: Record<string, number[]> = {
  红: [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
  蓝: [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
  绿: [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49],
};

// 五行映射 - 默认（马年）
const FIVE_ELEMENTS: Record<string, number[]> = {
  金: [4, 5, 12, 13, 26, 27, 34, 35, 42, 43],
  木: [8, 9, 16, 17, 24, 25, 38, 39, 46, 47],
  水: [1, 14, 15, 22, 23, 30, 31, 44, 45],
  火: [2, 3, 10, 11, 18, 19, 32, 33, 40, 41, 48, 49],
  土: [6, 7, 20, 21, 28, 29, 36, 37],
};

// 各生肖年的五行映射（蛇年和马年）
const FIVE_ELEMENTS_BY_YEAR: Record<number, Record<string, number[]>> = {
  6: { // 蛇年
    金: [3, 4, 11, 12, 25, 26, 33, 34, 41, 42],
    木: [7, 8, 15, 16, 23, 24, 37, 38, 45, 46],
    水: [13, 14, 21, 22, 29, 30, 43, 44],
    火: [1, 2, 9, 10, 17, 18, 31, 32, 39, 40, 47, 48],
    土: [5, 6, 19, 20, 27, 28, 35, 36, 49],
  },
  7: { // 马年（默认）
    金: [4, 5, 12, 13, 26, 27, 34, 35, 42, 43],
    木: [8, 9, 16, 17, 24, 25, 38, 39, 46, 47],
    水: [1, 14, 15, 22, 23, 30, 31, 44, 45],
    火: [2, 3, 10, 11, 18, 19, 32, 33, 40, 41, 48, 49],
    土: [6, 7, 20, 21, 28, 29, 36, 37],
  },
};

// 大小单双映射
const BIG_SMALL_ODD_EVEN: Record<string, number[]> = {
  小单: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
  小双: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
  大单: [25, 27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49],
  大双: [26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48],
};

// 基础生肖号码表（固定不变）
const BASE_ZODIAC_NUMBERS: Record<number, number[]> = {
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

const ZODIAC_NAMES: Record<number, string> = {
  1: '鼠', 2: '牛', 3: '虎', 4: '兔',
  5: '龙', 6: '蛇', 7: '马', 8: '羊',
  9: '猴', 10: '鸡', 11: '狗', 12: '猪'
};

// 根据生肖年份获取生肖映射
function getZodiacMap(zodiacYear: number): Record<string, number[]> {
  const zodiacMap: Record<string, number[]> = {};
  for (let position = 1; position <= 12; position++) {
    const zodiacIndex = ((zodiacYear - position) % 12 + 12) % 12 + 1;
    const zodiacName = ZODIAC_NAMES[zodiacIndex];
    zodiacMap[zodiacName] = BASE_ZODIAC_NUMBERS[position];
  }
  return zodiacMap;
}

// 获取所有元素
function getAllElements(): string[] {
  return [
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
    '特号', '特头', '特尾', '特合', '特合头', '特合尾', '特波', '特段', '特行', '特肖位',
    // 外部数据系列
    '星期', '干支', '干', '支'
  ];
}

// 数字各位之和
function digitSum(num: number): number {
  return Math.abs(num).toString().split('').reduce((sum, d) => sum + parseInt(d), 0);
}

// 获取波色值
function getWaveColor(num: number): number {
  if (WAVE_COLORS.红.includes(num)) return 0;
  if (WAVE_COLORS.蓝.includes(num)) return 1;
  if (WAVE_COLORS.绿.includes(num)) return 2;
  return 0;
}

// 获取五行值
function getFiveElement(num: number, zodiacYear?: number): number {
  const elements = (zodiacYear && FIVE_ELEMENTS_BY_YEAR[zodiacYear]) ? FIVE_ELEMENTS_BY_YEAR[zodiacYear] : FIVE_ELEMENTS;
  if (elements.金.includes(num)) return 0;
  if (elements.木.includes(num)) return 1;
  if (elements.水.includes(num)) return 2;
  if (elements.火.includes(num)) return 3;
  if (elements.土.includes(num)) return 4;
  return 0;
}

// 获取段位值
function getSegment(num: number): number {
  if (num >= 1 && num <= 7) return 1;
  if (num >= 8 && num <= 14) return 2;
  if (num >= 15 && num <= 21) return 3;
  if (num >= 22 && num <= 28) return 4;
  if (num >= 29 && num <= 35) return 5;
  if (num >= 36 && num <= 42) return 6;
  if (num >= 43 && num <= 49) return 7;
  return 1;
}

// 获取生肖位置
function getZodiacPosition(num: number, zodiacYear: number): number {
  const zodiacMap = getZodiacMap(zodiacYear);
  for (let i = 1; i <= 12; i++) {
    const zodiacName = ZODIAC_NAMES[i];
    if (zodiacMap[zodiacName]?.includes(num)) return i;
  }
  return 1;
}

// 汉字数字转阿拉伯数字
const CHINESE_NUMBERS: Record<string, number> = {
  '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
};

function chineseToNumber(str: string): string {
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

// 标准化元素名称
function normalizeElementName(name: string): string {
  let normalized = name;
  
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
  
  const aliases: Record<string, string> = {
    '特码': '特', '特号': '特',
    '平一': '平1', '平二': '平2', '平三': '平3',
    '平四': '平4', '平五': '平5', '平六': '平6',
    '期合尾': '期数合尾', '期合': '期数合',
    '特码头': '特头', '特码尾': '特尾', '特码号': '特号', '特码波': '特波', '特码行': '特行', '特码五行': '特行',
  };
  for (const [alias, standard] of Object.entries(aliases)) {
    normalized = normalized.replace(new RegExp(alias, 'g'), standard);
  }
  
  // 处理简化表达式
  const simplifiedExprs: [string, string][] = [
    ['1肖位', '平1肖位'], ['2肖位', '平2肖位'], ['3肖位', '平3肖位'], ['4肖位', '平4肖位'], ['5肖位', '平5肖位'], ['6肖位', '平6肖位'],
    ['一肖位', '平1肖位'], ['二肖位', '平2肖位'], ['三肖位', '平3肖位'], ['四肖位', '平4肖位'], ['五肖位', '平5肖位'], ['六肖位', '平6肖位'],
    ['1五行', '平1行'], ['2五行', '平2行'], ['3五行', '平3行'], ['4五行', '平4行'], ['5五行', '平5行'], ['6五行', '平6行'],
    ['一五行', '平1行'], ['二五行', '平2行'], ['三五行', '平3行'], ['四五行', '平4行'], ['五五行', '平5行'], ['六五行', '平6行'],
    ['1行', '平1行'], ['2行', '平2行'], ['3行', '平3行'], ['4行', '平4行'], ['5行', '平5行'], ['6行', '平6行'],
    ['一行', '平1行'], ['二行', '平2行'], ['三行', '平3行'], ['四行', '平4行'], ['五行', '平5行'], ['六行', '平6行'],
  ];
  for (const [simplified, standard] of simplifiedExprs) {
    // 使用负向前瞻和负向后顾，避免重复替换已完整的形式
    normalized = normalized.replace(new RegExp(`(?<![平特])${simplified}(?![位头尾合波行号段])`, 'g'), standard);
  }
  
  return normalized;
}

// 获取号码属性值
function getNumberAttributeValue(num: number, attr: string, zodiacYear: number): number {
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

// 计算元素值（带缓存）
function calculateElementValue(element: string, data: LotteryData, useSort: boolean): number {
  const normalized = normalizeElementName(element);
  const period = data.period;
  const cacheKey = `${element}_${useSort}`;
  
  // 检查缓存
  if (elementCache.has(cacheKey)) {
    const periodCache = elementCache.get(cacheKey)!;
    if (periodCache.has(period)) {
      return periodCache.get(period)!;
    }
  }
  
  // D规则：平码按大小排序，特码位置不变
  const pingma = useSort ? [...data.numbers.slice(0, 6)].sort((a, b) => a - b) : data.numbers.slice(0, 6);
  const te = data.numbers[6];
  const numbers = [...pingma, te];
  
  let result: number = 0;
  
  // 期数系列 - 只取后3位计算
  const periodNum = data.period % 1000;
  if (normalized === '期数') result = periodNum;
  else if (normalized === '期数尾') result = periodNum % 10;
  else if (normalized === '期数合') result = digitSum(periodNum);
  else if (normalized === '期数合尾') result = digitSum(periodNum) % 10;
  
  // 外部数据系列
  else if (normalized === '星期') result = data.weekday ?? 0;
  else if (normalized === '干') {
    // 干：0-9
    const ganzhi = data.ganzhi || '甲子';
    result = '甲乙丙丁戊己庚辛壬癸'.indexOf(ganzhi[0]);
  }
  else if (normalized === '支') {
    // 支：0-11
    const ganzhi = data.ganzhi || '甲子';
    result = '子丑寅卯辰巳午未申酉戌亥'.indexOf(ganzhi[1]);
  }
  else if (normalized === '干支') {
    // 干支转为单一数值 (0-59)
    const ganzhi = data.ganzhi || '甲子';
    const stemIndex = '甲乙丙丁戊己庚辛壬癸'.indexOf(ganzhi[0]);
    const branchIndex = '子丑寅卯辰巳午未申酉戌亥'.indexOf(ganzhi[1]);
    result = stemIndex + branchIndex * 10;
  }
  
  // 总分系列
  else {
    const totalSum = numbers.reduce((sum, n) => sum + n, 0);
    if (normalized === '总分') result = totalSum;
    else if (normalized === '总分尾') result = totalSum % 10;
    else if (normalized === '总分合') result = digitSum(totalSum);
    else if (normalized === '总分合尾') result = digitSum(totalSum) % 10;
    
    // 平码系列
    else {
      const pingMatch = normalized.match(/^平(\d)(.+)$/);
      if (pingMatch) {
        const index = parseInt(pingMatch[1]) - 1;
        const attr = pingMatch[2];
        if (index >= 0 && index < 6) {
          result = getNumberAttributeValue(numbers[index], attr, data.zodiacYear);
        } else result = 0;
      }
      
      // 特码系列
      else {
        const teMatch = normalized.match(/^特(.+)$/);
        if (teMatch) {
          const attr = teMatch[1];
          result = getNumberAttributeValue(numbers[6], attr, data.zodiacYear);
        } else result = 0;
      }
    }
  }
  
  // 存入缓存
  if (!elementCache.has(cacheKey)) {
    elementCache.set(cacheKey, new Map());
  }
  elementCache.get(cacheKey)!.set(period, result);
  
  // 限制缓存大小
  if (elementCache.size > 100) {
    const keys = Array.from(elementCache.keys());
    elementCache.delete(keys[0]);
  }
  
  return result;
}

// 解析公式
function parseFormula(formulaStr: string): { expression: string; rule: 'D' | 'L'; resultType: ResultType; periods: number; offset: number; leftExpand: number; rightExpand: number; rawExpression: string } | null {
  try {
    const match = formulaStr.match(/^\[([DL])([^=]+)\]([^=]+)=(-?\d+)(?:左(\d+))?(?:右(\d+))?$/);
    if (!match) return null;
    
    const rule = match[1] as 'D' | 'L';
    const resultType = match[2] as ResultType;
    const expression = match[3];
    const periods = parseInt(match[4]) || 15;
    const leftExpand = match[5] ? parseInt(match[5]) : 0;
    const rightExpand = match[6] ? parseInt(match[6]) : 0;
    
    let offset = 0;
    const offsetMatch = expression.match(/[+-]?\d+$/);
    if (offsetMatch) {
      offset = parseInt(offsetMatch[0]);
    }
    
    return {
      expression: expression.replace(/[+-]?\d+$/, ''),
      rule,
      resultType,
      periods,
      offset,
      leftExpand,
      rightExpand,
      rawExpression: expression,
    };
  } catch {
    return null;
  }
}

// 解析条件表达式 {条件?值1:值2}
function evaluateCondition(condition: string, data: LotteryData): boolean {
  const teNum = data.numbers[6] || 0;
  const teTail = teNum % 10;
  const teHead = Math.floor(teNum / 10);
  const teHe = Math.floor(teNum / 10) + (teNum % 10);
  
  switch (condition) {
    case '特码大':
      return teNum > 24;
    case '特码小':
      return teNum <= 24;
    case '特码单':
      return teNum % 2 === 1;
    case '特码双':
      return teNum % 2 === 0;
    case '特尾大':
      return teTail >= 5;
    case '特尾小':
      return teTail < 5;
    case '特尾单':
      return teTail % 2 === 1;
    case '特尾双':
      return teTail % 2 === 0;
    case '特头大':
      return teHead >= 2;
    case '特头小':
      return teHead < 2;
    case '特合大':
      return teHe > 6;
    case '特合小':
      return teHe <= 6;
    case '特合单':
      return teHe % 2 === 1;
    case '特合双':
      return teHe % 2 === 0;
    default:
      return false;
  }
}

// 处理表达式中的条件元素 {条件?值1:值2}
function processConditionElements(expression: string, data: LotteryData): string {
  let result = expression;
  const conditionRegex = /\{([^?]+)\?([^:]+):(.+?)\}/g;
  
  let match;
  while ((match = conditionRegex.exec(result)) !== null) {
    const condition = match[1];
    const trueValue = match[2];
    const falseValue = match[3];
    const conditionResult = evaluateCondition(condition, data);
    const replaceValue = conditionResult ? trueValue : falseValue;
    result = result.replace(match[0], replaceValue);
  }
  
  return result;
}

// 评估表达式
function evaluateExpression(expression: string, data: LotteryData, useSort: boolean): number {
  let normalized = normalizeElementName(expression);
  
  // 先处理条件元素
  normalized = processConditionElements(normalized, data);
  
  // 替换元素为数值（按长度优先）
  const allElements = [
    '期数合尾', '期数合', '期数尾', '期数',
    '总分合尾', '总分合', '总分尾', '总分',
    ...Array.from({ length: 6 }, (_, i) => [
      `平${i + 1}合头`, `平${i + 1}合尾`, `平${i + 1}肖位`,
      `平${i + 1}号`, `平${i + 1}头`, `平${i + 1}尾`, `平${i + 1}合`,
      `平${i + 1}波`, `平${i + 1}段`, `平${i + 1}行`
    ]).flat(),
    '特合头', '特合尾', '特肖位',
    '特号', '特头', '特尾', '特合', '特波', '特段', '特行', '特',
  ];
  
  for (const elem of allElements) {
    const value = calculateElementValue(elem, data, useSort);
    normalized = normalized.replace(new RegExp(elem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value.toString());
  }
  
  // 只允许加号
  normalized = normalized.replace(/[×\*÷\/%\-]/g, '');
  
  // 计算结果
  try {
    if (!/^[\d+()\s]+$/.test(normalized)) return 0;
    // @ts-ignore
    return Math.floor(eval(normalized));
  } catch {
    return 0;
  }
}

// 应用循环规则
function applyCycle(value: number, resultType: ResultType): number {
  switch (resultType) {
    case '尾数类': return ((value % 10) + 10) % 10;
    case '头数类': return ((value % 5) + 5) % 5;
    case '合数类': return ((value % 14) + 14) % 14;
    case '波色类': return ((value % 3) + 3) % 3;
    case '五行类': return ((value % 5) + 5) % 5;
    case '肖位类': return ((value % 12) + 12) % 12 || 12;
    case '单特类': return ((value - 1) % 49 + 49) % 49 + 1;
    case '大小单双类': return ((value % 4) + 4) % 4;
    default: return value;
  }
}

// 获取扩展结果
function getExpandedResults(result: number, leftExpand: number, rightExpand: number, resultType: ResultType): number[] {
  const results: number[] = [];
  
  if (resultType === '单特类') {
    const baseValue = applyCycle(result, resultType);
    for (let i = -leftExpand; i <= rightExpand; i++) {
      const expanded = applyCycle(baseValue + i, resultType);
      if (expanded >= 1 && expanded <= 49) {
        results.push(expanded);
      }
    }
  } else {
    for (let i = -leftExpand; i <= rightExpand; i++) {
      results.push(applyCycle(result + i, resultType));
    }
  }
  
  return [...new Set(results)];
}

// 获取特码属性
function getNumberAttribute(num: number, resultType: ResultType, zodiacYear: number): number {
  switch (resultType) {
    case '尾数类': return num % 10;
    case '头数类': return Math.floor(num / 10);
    case '合数类': return String(num).split('').reduce((a, b) => a + parseInt(b), 0);
    case '波色类': {
      if (WAVE_COLORS.红.includes(num)) return 0;
      if (WAVE_COLORS.蓝.includes(num)) return 1;
      if (WAVE_COLORS.绿.includes(num)) return 2;
      return 0;
    }
    case '五行类': {
      if (FIVE_ELEMENTS.金.includes(num)) return 0;
      if (FIVE_ELEMENTS.木.includes(num)) return 1;
      if (FIVE_ELEMENTS.水.includes(num)) return 2;
      if (FIVE_ELEMENTS.火.includes(num)) return 3;
      if (FIVE_ELEMENTS.土.includes(num)) return 4;
      return 0;
    }
    case '肖位类': {
      const zodiacMap = getZodiacMap(zodiacYear);
      for (let i = 1; i <= 12; i++) {
        const zodiacName = ZODIAC_NAMES[i];
        if (zodiacMap[zodiacName]?.includes(num)) {
          return i;
        }
      }
      return 1;
    }
    case '大小单双类':
      if (BIG_SMALL_ODD_EVEN.小单.includes(num)) return 0;
      if (BIG_SMALL_ODD_EVEN.小双.includes(num)) return 1;
      if (BIG_SMALL_ODD_EVEN.大单.includes(num)) return 2;
      if (BIG_SMALL_ODD_EVEN.大双.includes(num)) return 3;
      return 0;
    default: return num;
  }
}

// 验证单个公式
function verifyFormula(
  parsed: ReturnType<typeof parseFormula>,
  historyData: LotteryData[],
  offset: number,
  periods: number,
  leftExpand: number,
  rightExpand: number
): { hitRate: number; hitCount: number; totalPeriods: number } {
  if (!parsed) return { hitRate: 0, hitCount: 0, totalPeriods: 0 };
  
  const dataToVerify = historyData.slice(0, periods);
  let hitCount = 0;
  const useSort = parsed.rule === 'D';
  
  for (let i = 0; i < dataToVerify.length; i++) {
    const verifyData = dataToVerify[i];
    const calcData = i > 0 ? dataToVerify[i - 1] : verifyData;
    
    const rawResult = evaluateExpression(parsed.expression, calcData, useSort);
    const withOffset = rawResult + parsed.offset + offset;
    const cycledResult = applyCycle(withOffset, parsed.resultType);
    const expandedResults = getExpandedResults(cycledResult, parsed.leftExpand + leftExpand, parsed.rightExpand + rightExpand, parsed.resultType);
    
    const targetValue = getNumberAttribute(verifyData.numbers[6], parsed.resultType, verifyData.zodiacYear);
    const hit = expandedResults.includes(targetValue);
    
    if (hit) hitCount++;
  }
  
  return {
    hitRate: dataToVerify.length > 0 ? hitCount / dataToVerify.length : 0,
    hitCount,
    totalPeriods: dataToVerify.length,
  };
}

// 元素分组定义 - 根据属性类型分组
const ELEMENT_GROUPS = {
  期数组: ['期数', '期数尾', '期数合', '期数合尾'],
  总分组: ['总分', '总分尾', '总分合', '总分合尾'],
  尾数组: ['平1尾', '平2尾', '平3尾', '平4尾', '平5尾', '平6尾', '特尾'],
  头数组: ['平1头', '平2头', '平3头', '平4头', '平5头', '平6头', '特头'],
  合数组: ['平1合', '平2合', '平3合', '平4合', '平5合', '平6合', '特合', '期数合', '总分合'],
  波数组: ['平1波', '平2波', '平3波', '平4波', '平5波', '平6波', '特波'],
  行数组: ['平1行', '平2行', '平3行', '平4行', '平5行', '平6行', '特行'],
  段数组: ['平1段', '平2段', '平3段', '平4段', '平5段', '平6段', '特段'],
  肖位数组: ['平1肖位', '平2肖位', '平3肖位', '平4肖位', '平5肖位', '平6肖位', '特肖位'],
  号数组: ['平1号', '平2号', '平3号', '平4号', '平5号', '平6号', '特号'],
};

// 结果类型与元素组的映射关系
const RESULT_TYPE_ELEMENT_MAP: Record<ResultType, string[]> = {
  '尾数类': ['尾数组', '期数组', '合数组'],
  '头数类': ['头数组'],
  '合数类': ['合数组', '期数组', '总分组'],
  '波色类': ['波数组'],
  '五行类': ['行数组'],
  '肖位类': ['肖位数组'],
  '单特类': ['号数组', '期数组'],
  '大小单双类': ['尾数组', '合数组', '段数组'],
};

// 公式模板库 - 预定义的高效模式
const FORMULA_TEMPLATES: Record<ResultType, string[][]> = {
  '尾数类': [
    ['特尾', '平1尾'],
    ['特尾', '期数尾'],
    ['平1尾', '平2尾', '平3尾'],
    ['期数合尾', '特尾'],
  ],
  '头数类': [
    ['特头', '平1头'],
    ['平1头', '平2头'],
  ],
  '合数类': [
    ['特合', '期数合'],
    ['特合', '平1合'],
    ['期数合', '总分合'],
    ['平1合', '平2合', '平3合'],
  ],
  '波色类': [
    ['特波', '平1波'],
    ['平1波', '平2波'],
  ],
  '五行类': [
    ['特行', '平1行'],
    ['平1行', '平2行', '平3行'],
  ],
  '肖位类': [
    ['特肖位', '平1肖位'],
    ['平1肖位', '平2肖位'],
  ],
  '单特类': [
    ['特号', '期数'],
    ['平1号', '平2号'],
  ],
  '大小单双类': [
    ['特尾', '期数尾'],
    ['特合', '平1合'],
    ['特段', '平1段'],
    ['平1段', '平2段'],
  ],
};

// 获取结果类型推荐的元素
function getRecommendedElements(resultType: ResultType): string[] {
  const groups = RESULT_TYPE_ELEMENT_MAP[resultType] || [];
  const elements: string[] = [];
  for (const group of groups) {
    elements.push(...(ELEMENT_GROUPS[group as keyof typeof ELEMENT_GROUPS] || []));
  }
  return elements;
}

// 从种子元素生成公式（多种子初始化）
function generateFromSeed(
  seedElement: string,
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number
): string | null {
  // 以种子元素为核心，添加更多相关元素
  const allElements = getAllElements();
  const relatedElements = getRelatedElements(resultType);
  
  // 从相关元素中选择3-8个元素
  const elementCount = 3 + Math.floor(Math.random() * 6);
  const elements: string[] = [seedElement];
  const used = new Set<string>([seedElement]);
  
  // 优先从相关元素中选择
  for (let i = 0; i < elementCount - 1; i++) {
    let elem: string;
    let attempts = 0;
    do {
      if (relatedElements.length > 0 && Math.random() > 0.3) {
        elem = relatedElements[Math.floor(Math.random() * relatedElements.length)];
      } else {
        elem = allElements[Math.floor(Math.random() * allElements.length)];
      }
      attempts++;
    } while (used.has(elem) && attempts < 20);
    used.add(elem);
    elements.push(elem);
  }
  
  const expression = elements.join('+');
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
  const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
  
  return `[${rule}${resultType}]${expression}${offsetStr}=${periods}${leftStr}${rightStr}`;
}

// 从模板生成公式 - 根据策略确定元素数量
function generateFromTemplate(
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number,
  searchStrategy: 'fast' | 'standard' | 'deep' = 'standard'
): string | null {
  // 根据策略确定元素数量范围
  let minElements: number, maxElements: number;
  switch (searchStrategy) {
    case 'fast':
      minElements = 1;
      maxElements = 5;
      break;
    case 'standard':
      minElements = 5;
      maxElements = 10;
      break;
    case 'deep':
      minElements = 10;
      maxElements = 15;
      break;
    default:
      minElements = 1;
      maxElements = 5;
  }
  
  // 获取相关元素池
  const elementPool = getRelatedElements(resultType);
  const allElements = getAllElements();
  const pool = elementPool.length > 0 ? elementPool : allElements.slice(0, 30);
  
  // 随机选择一个元素数量
  const elementCount = minElements + Math.floor(Math.random() * (maxElements - minElements + 1));
  
  // 生成不重复的随机组合
  const elements: string[] = [];
  const used = new Set<string>();
  for (let i = 0; i < elementCount; i++) {
    let elem: string;
    let attempts = 0;
    do {
      elem = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    } while (used.has(elem) && attempts < 20);
    used.add(elem);
    elements.push(elem);
  }
  
  if (elements.length < 3) return null;
  
  const expression = elements.join('+');
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
  const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
  
  return `[${rule}${resultType}]${expression}${offsetStr}=${periods}${leftStr}${rightStr}`;
}

// 获取与结果类型相关的元素（现在返回所有元素，支持跨类型搜索）
function getRelatedElements(resultType: ResultType): string[] {
  return getAllElements();
}

// 生成指定大小的所有组合
function* generateCombinationsOfSize(
  pool: string[], 
  count: number
): Generator<string[]> {
  const indices: number[] = [];
  
  function* next(i: number): Generator<string[]> {
    if (indices.length === count) {
      yield indices.map(idx => pool[idx]);
      return;
    }
    if (i >= pool.length) return;
    
    indices.push(i);
    yield* next(i + 1);
    indices.pop();
    
    yield* next(i + 1);
  }
  
  yield* next(0);
}

// 全组合搜索（遍历所有可能，带缓存和剪枝）
function exhaustiveSearch(
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number,
  historyData: LotteryData[],
  targetHitRate: number,
  maxResults: number,
  tolerance: number,
  strategy: 'fast' | 'standard' | 'deep',
  onProgress: (current: number, total: number, found: number, currentResults?: { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[]) => void
): { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[] {
  const results: { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[] = [];
  
  // 根据策略确定元素数量范围
  let minElements: number;
  let maxElements: number;
  switch (strategy) {
    case 'fast':
      minElements = 1;
      maxElements = 5;
      break;
    case 'standard':
      minElements = 5;
      maxElements = 10;
      break;
    case 'deep':
      minElements = 10;
      maxElements = 15;
      break;
    default:
      minElements = 1;
      maxElements = 5;
  }
  
  // 获取相关元素池（使用所有元素，支持跨类型搜索）
  const elementPool = getRelatedElements(resultType);
  
  // 缓存已验证的元素组合（用于剪枝）
  const elementCache = new Map<string, number>();
  
  let processed = 0;
  let totalCombos = 0;
  
  // 计算总组合数
  for (let c = minElements; c <= maxElements; c++) {
    let combos = 1;
    for (let i = 0; i < c; i++) {
      combos *= (elementPool.length - i);
      combos /= (i + 1);
    }
    totalCombos += combos;
  }
  
  let found = 0;
  
  // 渐进式搜索：从1个元素到maxElements
  for (let elementCount = minElements; elementCount <= maxElements; elementCount++) {
    
    // 遍历指定数量的所有组合
    for (const elements of generateCombinationsOfSize(elementPool, elementCount)) {
      processed++;
      
      if (processed % 5000 === 0) {
        onProgress(processed, totalCombos, found, results);
      }
      
      // 剪枝：检查前面部分元素的命中率
      if (elements.length > 1) {
        // 检查前面一半元素的命中率
        const halfCount = Math.ceil(elements.length / 2);
        const prefixElements = elements.slice(0, halfCount);
        const prefixKey = prefixElements.sort().join('+');
        
        if (elementCache.has(prefixKey)) {
          const cachedRate = elementCache.get(prefixKey)!;
          // 如果前面一半元素命中率很低，后面加元素也救不回来
          const maxPossibleRate = cachedRate + (100 - cachedRate) * 0.3;
          if (maxPossibleRate < targetHitRate - tolerance) {
            continue; // 跳过这个组合
          }
        }
      }
      
      const expression = elements.join('+');
      const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
      const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
      const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
      
      const formula = `[${rule}${resultType}]${expression}${offsetStr}=${periods}${leftStr}${rightStr}`;
      
      const parsed = parseFormula(formula);
      if (!parsed) continue;
      
      const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
      const hitRate = result.hitRate * 100;
      
      // 缓存这个元素组合的命中率（用于剪枝）
      const cacheKey = [...elements].sort().join('+');
      elementCache.set(cacheKey, hitRate);
      
      if (Math.abs(hitRate - targetHitRate) <= tolerance) {
        results.push({
          formula,
          hitRate: result.hitRate,
          hitCount: result.hitCount,
          totalPeriods: result.totalPeriods,
        });
        found++;
        
        if (found >= maxResults) {
        onProgress(processed, totalCombos, found, results);
          return results;
        }
      }
    }
  }
  
  onProgress(processed, totalCombos, found, results);
  return results;
}

// 变异公式 - 在现有公式基础上修改（更激进的策略）
function mutateFormula(
  formulaStr: string,
  allElements: string[],
  mutationRate: number = 0.5,
  periods: number = 50
): string | null {
  const parsed = parseFormula(formulaStr);
  if (!parsed) return null;
  
  const elements = parsed.expression.split('+').filter(e => e.trim());
  if (elements.length === 0) return null;
  
  // 根据期数确定元素数量范围
  const maxElements = periods <= 20 ? 20 : periods <= 50 ? 15 : 10;
  const minElements = 2;
  
  const newElements: string[] = [];
  const recommended = getRecommendedElements(parsed.resultType);
  
  for (const elem of elements) {
    if (Math.random() < mutationRate) {
      // 变异：替换为新元素（优先从推荐元素中选择）
      if (recommended.length > 0) {
        newElements.push(recommended[Math.floor(Math.random() * recommended.length)]);
      } else {
        newElements.push(allElements[Math.floor(Math.random() * allElements.length)]);
      }
    } else {
      newElements.push(elem);
    }
  }
  
  // 增加元素变异的概率和数量
  const addProb = 0.35; // 提高添加概率
  const removeProb = 0.2; // 提高删除概率
  const shuffleProb = 0.15; // 新增：打乱顺序
  
  // 添加新元素
  if (Math.random() < addProb && newElements.length < maxElements) {
    const newElem = recommended.length > 0
      ? recommended[Math.floor(Math.random() * recommended.length)]
      : allElements[Math.floor(Math.random() * allElements.length)];
    const pos = Math.floor(Math.random() * (newElements.length + 1));
    newElements.splice(pos, 0, newElem);
  }
  
  // 删除元素
  if (Math.random() < removeProb && newElements.length > minElements) {
    const pos = Math.floor(Math.random() * newElements.length);
    newElements.splice(pos, 1);
  }
  
  // 打乱顺序（增加多样性）
  if (Math.random() < shuffleProb && newElements.length > 1) {
    for (let i = newElements.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newElements[i], newElements[j]] = [newElements[j], newElements[i]];
    }
  }
  
  // 完全重写（极端情况）
  if (Math.random() < 0.1) {
    return generateFromSeed(
      recommended[Math.floor(Math.random() * recommended.length)] || allElements[0],
      parsed.resultType,
      Math.random() > 0.5 ? 'D' : 'L',
      periods,
      parsed.offset,
      parsed.leftExpand,
      parsed.rightExpand
    );
  }
  
  if (newElements.length < minElements) return null;
  
  const expression = newElements.join('+');
  const offsetStr = parsed.offset >= 0 ? `+${parsed.offset}` : `${parsed.offset}`;
  const leftStr = parsed.leftExpand > 0 ? `左${parsed.leftExpand}` : '';
  const rightStr = parsed.rightExpand > 0 ? `右${parsed.rightExpand}` : '';
  
  return `[${parsed.rule}${parsed.resultType}]${expression}${offsetStr}=${parsed.periods}${leftStr}${rightStr}`;
}

// 进化搜索算法
function evolutionarySearch(
  historyData: LotteryData[],
  targetHitRate: number,
  maxCount: number,
  strategy: 'fast' | 'standard' | 'deep',
  resultTypes: ResultType[],
  offset: number,
  periods: number,
  leftExpand: number,
  rightExpand: number,
  onProgress: (current: number, total: number, found: number, currentResults?: { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[]) => void
): { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[] {
  
  const allElements = getAllElements();
  const results: { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[] = [];
  
  // 容差根据期数动态调整
  const tolerance = periods <= 15 ? 1 : periods <= 30 ? 2 : periods <= 50 ? 3 : periods <= 100 ? 5 : 8;
  
  // 深度策略使用全组合搜索
  if (strategy === 'deep') {
    const seenFormulas = new Set<string>();
    
    for (const resultType of resultTypes) {
      for (const rule of ['D', 'L'] as const) {
        const exhaustiveResults = exhaustiveSearch(
          resultType,
          rule,
          periods,
          offset,
          leftExpand,
          rightExpand,
          historyData,
          targetHitRate,
          maxCount,
          tolerance,
          strategy,
          onProgress
        );
        
        for (const r of exhaustiveResults) {
          if (!seenFormulas.has(r.formula)) {
            seenFormulas.add(r.formula);
            results.push(r);
            if (results.length >= maxCount) break;
          }
        }
        
        if (results.length >= maxCount) break;
      }
      if (results.length >= maxCount) break;
    }
    
    return results;
  }
  
  const seenFormulas = new Set<string>();
  
  // 根据策略确定参数
  let populationSize: number, generations: number, mutationRate: number;
  switch (strategy) {
    case 'fast':
      populationSize = 150;
      generations = 15;
      mutationRate = 0.5; // 更激进的变异率
      break;
    case 'standard':
      populationSize = 300;
      generations = 25;
      mutationRate = 0.4;
      break;
    default:
      populationSize = 150;
      generations = 15;
      mutationRate = 0.5;
  }
  
  const totalIterations = populationSize * generations;
  let currentIteration = 0;
  
  // ==================== 多种子初始化 ====================
  // 使用所有元素作为种子，支持跨类型搜索
  const seedElementsByType: Record<ResultType, string[]> = {
    '尾数类': getAllElements(),
    '头数类': getAllElements(),
    '合数类': getAllElements(),
    '波色类': getAllElements(),
    '五行类': getAllElements(),
    '肖位类': getAllElements(),
    '单特类': getAllElements(),
    '大小单双类': getAllElements(),
  };
  
  // 第一阶段：从不同种子元素生成初始种群
  for (const resultType of resultTypes) {
    const seedElements = seedElementsByType[resultType] || [];
    for (const seedElem of seedElements.slice(0, 3)) { // 每个类型取3个种子
      for (const rule of ['D', 'L'] as const) {
        // 基于种子元素生成公式
        const formula = generateFromSeed(seedElem, resultType, rule, periods, offset, leftExpand, rightExpand);
        if (formula && !seenFormulas.has(formula)) {
          seenFormulas.add(formula);
          const parsed = parseFormula(formula);
          if (parsed) {
            const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
            const hitRate = result.hitRate * 100;
            if (Math.abs(hitRate - targetHitRate) <= tolerance * 2) { // 放宽初始容差
              results.push({
                formula,
                hitRate: result.hitRate,
                hitCount: result.hitCount,
                totalPeriods: result.totalPeriods,
              });
            }
          }
        }
        currentIteration++;
      }
    }
  }
  
  // 第二阶段：基于模板生成更多初始解
  for (const resultType of resultTypes) {
    for (const rule of ['D', 'L'] as const) {
      const formula = generateFromTemplate(resultType, rule, periods, offset, leftExpand, rightExpand, strategy);
      if (formula && !seenFormulas.has(formula)) {
        seenFormulas.add(formula);
        const parsed = parseFormula(formula);
        if (parsed) {
          const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
          const hitRate = result.hitRate * 100;
          if (Math.abs(hitRate - targetHitRate) <= tolerance) {
            results.push({
              formula,
              hitRate: result.hitRate,
              hitCount: result.hitCount,
              totalPeriods: result.totalPeriods,
            });
          }
        }
      }
      currentIteration++;
    }
  }
  
  // 第二阶段：基于推荐元素的智能生成
  let bestFormulas = [...results].sort((a, b) => b.hitRate - a.hitRate).slice(0, 20);
  
  for (let gen = 0; gen < generations; gen++) {
    const newPopulation: typeof results = [];
    
    // 从优秀公式变异
    for (const best of bestFormulas) {
      for (let i = 0; i < 3; i++) {
        const mutated = mutateFormula(best.formula, allElements, mutationRate, periods);
        if (mutated && !seenFormulas.has(mutated)) {
          seenFormulas.add(mutated);
          const parsed = parseFormula(mutated);
          if (parsed) {
            const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
            const hitRate = result.hitRate * 100;
            if (Math.abs(hitRate - targetHitRate) <= tolerance) {
              newPopulation.push({
                formula: mutated,
                hitRate: result.hitRate,
                hitCount: result.hitCount,
                totalPeriods: result.totalPeriods,
              });
            }
          }
        }
        currentIteration++;
        if (currentIteration % 50 === 0) {
          onProgress(currentIteration, totalIterations, results.length, results);
        }
      }
    }
    
    // 随机生成补充
    for (let i = 0; i < populationSize / 2; i++) {
      const resultType = resultTypes[Math.floor(Math.random() * resultTypes.length)];
      const rule = Math.random() < 0.5 ? 'D' : 'L' as const;
      const recommended = getRecommendedElements(resultType);
      
      const elementCount = Math.floor(Math.random() * 5) + 1;
      const shuffled = [...recommended].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, elementCount);
      
      if (selected.length === 0) continue;
      
      const expression = selected.join('+');
      const randomOffset = Math.floor(Math.random() * 10) - 5;
      const offsetStr = randomOffset >= 0 ? `+${randomOffset}` : `${randomOffset}`;
      
      const formulaStr = `[${rule}${resultType}]${expression}${offsetStr}=${periods}`;
      
      if (seenFormulas.has(formulaStr)) continue;
      seenFormulas.add(formulaStr);
      
      const parsed = parseFormula(formulaStr);
      if (parsed) {
        const result = verifyFormula(parsed, historyData, 0, periods, 0, 0);
        const hitRate = result.hitRate * 100;
        if (Math.abs(hitRate - targetHitRate) <= tolerance) {
          newPopulation.push({
            formula: formulaStr,
            hitRate: result.hitRate,
            hitCount: result.hitCount,
            totalPeriods: result.totalPeriods,
          });
        }
      }
      currentIteration++;
    }
    
    // 合并结果并更新最佳公式
    results.push(...newPopulation);
    bestFormulas = [...results].sort((a, b) => b.hitRate - a.hitRate).slice(0, 20);
    
    onProgress(currentIteration, totalIterations, results.length, results);
    
    if (results.length >= maxCount * 2) break;
  }
  
  return results;
}

// 保留随机生成函数作为备用
function generateRandomFormula(
  elements: string[],
  elementCount: number,
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number
): string {
  const shuffled = [...elements].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(elementCount, elements.length));
  
  let expression = selected[0];
  for (let i = 1; i < selected.length; i++) {
    expression += '+' + selected[i];
  }
  
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
  const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
  
  return `[${rule}${resultType}]${expression}${offsetStr}=${periods}${leftStr}${rightStr}`;
}

// Worker 消息处理
self.onmessage = (event) => {
  const { type, historyData, targetHitRate, maxCount, strategy, resultTypes, offset, periods, leftExpand, rightExpand } = event.data;
  
  if (type !== 'search') return;
  
  try {
    // 使用进化搜索算法
    const results = evolutionarySearch(
      historyData,
      targetHitRate,
      maxCount,
      strategy,
      resultTypes,
      offset,
      periods,
      leftExpand,
      rightExpand,
      (current, total, found, currentResults) => {
        self.postMessage({
          type: 'progress',
          current,
          total,
          found,
          results: currentResults || []
        });
      }
    );
    
    // 按命中率排序
    if (targetHitRate >= 50) {
      results.sort((a, b) => b.hitRate - a.hitRate);
    } else {
      results.sort((a, b) => a.hitRate - b.hitRate);
    }
    
    self.postMessage({
      type: 'complete',
      results: results.slice(0, maxCount)
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: String(error)
    });
  }
};

export {};
