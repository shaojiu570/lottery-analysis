// 验证 Worker - 将计算移到后台线程
import type { LotteryData, VerifyResult } from '../types';

// ==================== Worker缓存系统 ====================
// 预计算数据存储
interface PrecomputedData {
  period: number;
  useSort: boolean;
  elementValues: Record<string, number>;
}

const precomputedDataMap = new Map<number, PrecomputedData[]>();

// 预计算所有历史数据的元素值
function precomputeAllElementValues(historyData: LotteryData[]): void {
  precomputedDataMap.clear();
  
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
    
    precomputedDataMap.set(data.period, [
      { period: data.period, useSort: true, elementValues: elementValuesD },
      { period: data.period, useSort: false, elementValues: elementValuesL }
    ]);
  }
}

// ==================== 消息批处理 ====================

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

// 基础生肖号码表
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

function getZodiacMap(zodiacYear: number): Record<string, number[]> {
  const zodiacMap: Record<string, number[]> = {};
  for (let position = 1; position <= 12; position++) {
    const zodiacIndex = ((zodiacYear - position) % 12 + 12) % 12 + 1;
    const zodiacName = ZODIAC_NAMES[zodiacIndex];
    zodiacMap[zodiacName] = BASE_ZODIAC_NUMBERS[position];
  }
  return zodiacMap;
}

// 结果值转文字函数
function getWaveColorName(value: number): string {
  const names = ['红波', '蓝波', '绿波'];
  return names[value % 3];
}

function getFiveElementName(value: number): string {
  const names = ['金', '木', '水', '火', '土'];
  return names[value % 5];
}

function getZodiacName(position: number): string {
  const pos = ((position - 1) % 12) + 1;
  return ZODIAC_NAMES[pos] || '鼠';
}

function getBigSmallOddEvenName(value: number): string {
  const names = ['小单', '小双', '大单', '大双'];
  return names[value % 4];
}

function resultToText(value: number, resultType: string, zodiacYear?: number): string {
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
      return getZodiacName(getZodiacPosition(value, zodiacYear || 7));
    case '单特类':
      return value.toString().padStart(2, '0');
    case '大小单双类':
      return getBigSmallOddEvenName(value);
    default:
      return value.toString();
  }
}

// 获取号码属性值
function getNumberAttribute(num: number, resultType: string, zodiacYear: number): number {
  switch (resultType) {
    case '尾数类': return num % 10;
    case '头数类': return Math.floor(num / 10);
    case '合数类': return String(num).split('').reduce((a, b) => a + parseInt(b), 0);
    case '波色类':
      if (WAVE_COLORS.红.includes(num)) return 0;
      if (WAVE_COLORS.蓝.includes(num)) return 1;
      if (WAVE_COLORS.绿.includes(num)) return 2;
      return 0;
    case '五行类':
      return getFiveElement(num, zodiacYear);
    case '肖位类': {
      const zodiacMap = getZodiacMap(zodiacYear);
      for (let i = 1; i <= 12; i++) {
        const zodiacName = ZODIAC_NAMES[i];
        if (zodiacMap[zodiacName]?.includes(num)) return i;
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
  
  // 保护结果类型不被替换
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
  
  // 处理别名
  const aliases: Record<string, string> = {
    '特码': '特', '特号': '特',
    '平一': '平1', '平二': '平2', '平三': '平3',
    '平四': '平4', '平五': '平5', '平六': '平6',
    '期合尾': '期数合尾', '期合': '期数合',
    // 简化表达式
    '特码头': '特头', '特码尾': '特尾', '特码号': '特号', '特码波': '特波', '特码行': '特行', '特码五行': '特行',
  };
  for (const [alias, standard] of Object.entries(aliases)) {
    normalized = normalized.replace(new RegExp(alias, 'g'), standard);
  }
  
  // 处理简化表达式：数字+属性 -> 平码（按长度优先匹配）
  const simplifiedExprs: [string, string][] = [
    ['1肖位', '平1肖位'], ['2肖位', '平2肖位'], ['3肖位', '平3肖位'], ['4肖位', '平4肖位'], ['5肖位', '平5肖位'], ['6肖位', '平6肖位'],
    ['一肖位', '平1肖位'], ['二肖位', '平2肖位'], ['三肖位', '平3肖位'], ['四肖位', '平4肖位'], ['五肖位', '平5肖位'], ['六肖位', '平6肖位'],
    ['1五行', '平1行'], ['2五行', '平2行'], ['3五行', '平3行'], ['4五行', '平4行'], ['5五行', '平5行'], ['6五行', '平6行'],
    ['一五行', '平1行'], ['二五行', '平2行'], ['三五行', '平3行'], ['四五行', '平4行'], ['五五行', '平5行'], ['六五行', '平6行'],
    ['1行', '平1行'], ['2行', '平2行'], ['3行', '平3行'], ['4行', '平4行'], ['5行', '平5行'], ['6行', '平6行'],
    ['一行', '平1行'], ['二行', '平2行'], ['三行', '平3行'], ['四行', '平4行'], ['五行', '平5行'], ['六行', '平6行'],
  ];
  for (const [simplified, standard] of simplifiedExprs) {
    // 使用负向前瞻 and 负向后顾，避免重复替换已完整的形式
    normalized = normalized.replace(new RegExp(`(?<![平特])${simplified}(?![位头尾合波行号段])`, 'g'), standard);
  }
  
  // 还原结果类型
  for (let i = 0; i < rtList.length; i++) {
    normalized = normalized.replace(`__TYP${i}__`, rtList[i]);
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

// 计算元素值
function calculateElementValue(element: string, data: LotteryData, useSort: boolean): number {
  const normalized = normalizeElementName(element);
  // D规则：平码按大小排序，特码位置不变
  const pingma = useSort ? [...data.numbers.slice(0, 6)].sort((a, b) => a - b) : data.numbers.slice(0, 6);
  const te = data.numbers[6];
  const numbers = [...pingma, te];
  
  // 期数系列 - 只取后3位计算
  const periodNum = data.period % 1000;
  if (normalized === '期数') return periodNum;
  if (normalized === '期数尾') return periodNum % 10;
  if (normalized === '期数合') return digitSum(periodNum);
  if (normalized === '期数合尾') return digitSum(periodNum) % 10;
  
  // 外部数据系列
  if (normalized === '星期') return data.weekday ?? 0;
  if (normalized === '干') {
    const ganzhi = data.ganzhi || '甲子';
    return '甲乙丙丁戊己庚辛壬癸'.indexOf(ganzhi[0]);
  }
  if (normalized === '支') {
    const ganzhi = data.ganzhi || '甲子';
    return '子丑寅卯辰巳午未申酉戌亥'.indexOf(ganzhi[1]);
  }
  if (normalized === '干支') {
    const ganzhi = data.ganzhi || '甲子';
    const stemIndex = '甲乙丙丁戊己庚辛壬癸'.indexOf(ganzhi[0]);
    const branchIndex = '子丑寅卯辰巳午未申酉戌亥'.indexOf(ganzhi[1]);
    return stemIndex + branchIndex * 10;
  }
  
  // 总分系列
  const totalSum = numbers.reduce((sum, n) => sum + n, 0);
  if (normalized === '总分') return totalSum;
  if (normalized === '总分尾') return totalSum % 10;
  if (normalized === '总分合') return digitSum(totalSum);
  if (normalized === '总分合尾') return digitSum(totalSum) % 10;
  
  // 平码系列 (平1号 - 平6肖位)
  const pingMatch = normalized.match(/^平(\d)(.+)$/);
  if (pingMatch) {
    const index = parseInt(pingMatch[1]) - 1;
    const attr = pingMatch[2];
    if (index >= 0 && index < 6) {
      return getNumberAttributeValue(numbers[index], attr, data.zodiacYear);
    }
  }
  
  // 特码系列 (特号 - 特肖位)
  const teMatch = normalized.match(/^特(.+)$/);
  if (teMatch) {
    const attr = teMatch[1];
    return getNumberAttributeValue(numbers[6], attr, data.zodiacYear);
  }
  
  return 0;
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

// 评估表达式 - 只允许加号
function evaluateExpression(expression: string, data: LotteryData, useSort: boolean): number {
  let normalized = normalizeElementName(expression);
  
  // 先处理条件元素
  normalized = processConditionElements(normalized, data);
  
  // 替换元素为数值（按长度优先，避免短元素名被先替换）
  const allElements = [
    // 期数系列
    '期数合尾', '期数合', '期数尾', '上期数', '期数',
    // 总分系列
    '总分合尾', '总分合', '总分尾', '总分',
    // 平码系列 (每个号码的各属性，按长度优先)
    ...Array.from({ length: 6 }, (_, i) => [
      `平${i + 1}合头`, `平${i + 1}合尾`, `平${i + 1}肖位`,
      `平${i + 1}号`, `平${i + 1}头`, `平${i + 1}尾`, `平${i + 1}合`,
      `平${i + 1}波`, `平${i + 1}段`, `平${i + 1}行`
    ]).flat(),
    // 特码系列
    '特合头', '特合尾', '特肖位',
    '特号', '特头', '特尾', '特合', '特波', '特段', '特行', '特',
  ];
  
  for (const elem of allElements) {
    const value = calculateElementValue(elem, data, useSort);
    normalized = normalized.replace(new RegExp(elem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value.toString());
  }
  
  // 将其他运算符替换为空或移除（只允许加号）
  normalized = normalized.replace(/[×\*÷\/%\-]/g, '');
  
  // 安全计算 - 只允许加号
  try {
    if (!/^[\d+()\s]+$/.test(normalized)) {
      return 0;
    }
    // @ts-ignore
    return Math.floor(eval(normalized));
  } catch (e) {
    return 0;
  }
}

// 应用循环规则
function applyCycle(value: number, resultType: string): number {
  switch (resultType) {
    case '尾数类': return ((value % 10) + 10) % 10;
    case '头数类': return ((value % 5) + 5) % 5;
    case '合数类': return ((value - 1) % 13 + 13) % 13 + 1;
    case '波色类': return ((value % 3) + 3) % 3;
    case '五行类': return ((value % 5) + 5) % 5;
    case '肖位类': return ((value - 1) % 12 + 12) % 12 + 1;
    case '单特类': return ((value - 1) % 49 + 49) % 49 + 1;
    case '大小单双类': return ((value % 4) + 4) % 4;
    default: return value;
  }
}

// 扩展结果
function getExpandedResults(result: number, leftExpand: number, rightExpand: number, resultType: string): number[] {
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
    // 其他类型：扩展属性值
    for (let i = -leftExpand; i <= rightExpand; i++) {
      results.push(applyCycle(result + i, resultType));
    }
  }
  
  return [...new Set(results)];
}

// 验证单个公式
function verifyFormula(
  parsed: any,
  historyData: LotteryData[],
  periods: number,
  leftExpand: number,
  rightExpand: number,
  targetPeriodVal: number | null = null
): any {
  if (!parsed) return { hitRate: 0, hitCount: 0, totalPeriods: 0, formula: parsed, hits: [], results: [], targetPeriod: targetPeriodVal };
  
  const dataToVerify = historyData.slice(0, periods);
  let hitCount = 0;
  const useSort = parsed.rule === 'D';
  const hits: boolean[] = [];
  const periodResults: any[] = [];
  
  for (let i = 0; i < dataToVerify.length; i++) {
    const verifyData = dataToVerify[i];
    // 验证历史期：用上一期数据计算
    // 历史数据是降序排列（最新在前），所以用 i + 1 获取上一期（更旧的一期）
    const calcData = (i < dataToVerify.length - 1) ? dataToVerify[i + 1] : verifyData;
    
    const rawResult = evaluateExpression(parsed.expression, calcData, useSort);
    const withOffset = rawResult + parsed.offset;
    const cycledResult = applyCycle(withOffset, parsed.resultType);
    const expandedResults = getExpandedResults(cycledResult, leftExpand, rightExpand, parsed.resultType);
    
    const targetValue = getNumberAttribute(verifyData.numbers[6], parsed.resultType, verifyData.zodiacYear);
    const hit = expandedResults.includes(targetValue);
    
    if (hit) hitCount++;
    hits.push(hit);
    periodResults.push({
      period: verifyData.period,
      result: cycledResult,
      expandedResults,
      targetValue,
      hit
    });
  }
  
  // 反转数组，使顺序变为从旧到新（最旧期在前，最新期在后）
  hits.reverse();
  periodResults.reverse();
  
  // 只取最新一期的结果（反转后periodResults[periodResults.length-1]是最新的）
  const latestResults = periodResults.length > 0 
    ? (periodResults[periodResults.length - 1] as { expandedResults: number[] }).expandedResults 
    : [];
  const latestZodiacYear = dataToVerify.length > 0 ? dataToVerify[0].zodiacYear : undefined;
  const results = Array.from(latestResults).sort((a, b) => a - b).map(v => resultToText(v, parsed.resultType, latestZodiacYear));
  
  return {
    hitRate: dataToVerify.length > 0 ? hitCount / dataToVerify.length : 0,
    hitCount,
    totalPeriods: dataToVerify.length,
    formula: parsed,
    hits,
    results,
    periodResults,
    targetPeriod: targetPeriodVal,
    originalLineIndex: (parsed as { originalLineIndex?: number }).originalLineIndex ?? 0
  };
}

// 批量验证公式
self.onmessage = async (event) => {
  const { type, formulas, historyData, targetPeriod } = event.data;
  
  if (type === 'precompute' && historyData) {
    // 预计算阶段
    precomputeAllElementValues(historyData);
    self.postMessage({ type: 'precomputeComplete' });
    return;
  }
  
  if (type !== 'verify') return;
  
  // 先预计算
  if (historyData.length > 0) {
    precomputeAllElementValues(historyData);
  }
  
  try {
    const results: VerifyResult[] = [];
    const BATCH_SIZE = 20; // 每批处理数量
    
    // 分帧处理函数
    const processBatch = (startIndex: number): Promise<void> => {
      return new Promise((resolve) => {
        const endIndex = Math.min(startIndex + BATCH_SIZE, formulas.length);
        
        for (let i = startIndex; i < endIndex; i++) {
          const formula = formulas[i];
          
          // 确定验证范围
          let dataToVerify: LotteryData[];
          if (targetPeriod) {
            const targetIdx = historyData.findIndex((d: LotteryData) => d.period === targetPeriod);
            if (targetIdx !== -1) {
              dataToVerify = historyData.slice(targetIdx);
            } else {
              dataToVerify = historyData;
            }
          } else {
            dataToVerify = historyData;
          }
          
          // 使用公式原始参数，不再覆盖（设置参数只对无参数的新公式生效）
          const overridePeriods = formula.periods || dataToVerify.length;
          const overrideLeft = formula.leftExpand || 0;
          const overrideRight = formula.rightExpand || 0;
          
          // 验证公式（offset已包含在formula.offset中）
          const result = verifyFormula(formula, dataToVerify, overridePeriods, overrideLeft, overrideRight, targetPeriod);
          results.push(result);
        }
        
        // 发送进度
        self.postMessage({
          type: 'progress',
          current: endIndex,
          total: formulas.length
        });
        
        if (endIndex < formulas.length) {
          // 使用requestIdleCallback分散负载
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => processBatch(endIndex).then(resolve), { timeout: 100 });
          } else {
            setTimeout(() => processBatch(endIndex).then(resolve), 0);
          }
        } else {
          resolve();
        }
      });
    };
    
    await processBatch(0);
    
    self.postMessage({
      type: 'complete',
      results
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: String(error)
    });
  }
};

export {};
