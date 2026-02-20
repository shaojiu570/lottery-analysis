// 验证 Worker - 将计算移到后台线程
import type { LotteryData, VerifyResult } from '../types';

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
      if (FIVE_ELEMENTS.金.includes(num)) return 0;
      if (FIVE_ELEMENTS.木.includes(num)) return 1;
      if (FIVE_ELEMENTS.水.includes(num)) return 2;
      if (FIVE_ELEMENTS.火.includes(num)) return 3;
      if (FIVE_ELEMENTS.土.includes(num)) return 4;
      return 0;
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
  let normalized = chineseToNumber(name);
  
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
    normalized = normalized.replace(new RegExp(`(?<![平特])${simplified}`, 'g'), standard);
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
function calculateElementValue(element: string, data: LotteryData): number {
  const normalized = normalizeElementName(element);
  const numbers = data.numbers;
  
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

// 评估表达式 - 只允许加号
function evaluateExpression(expression: string, data: LotteryData): number {
  let normalized = normalizeElementName(expression);
  
  // 替换元素为数值（按长度优先，避免短元素名被先替换）
  const allElements = [
    // 期数系列
    '期数合尾', '期数合', '期数尾', '期数',
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
    const value = calculateElementValue(elem, data);
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
    case '头数类': return Math.min(Math.max(value, 0), 4);
    case '合数类': return Math.min(Math.max(value, 0), 13);
    case '波色类': return ((value % 3) + 3) % 3;
    case '五行类': return ((value % 5) + 5) % 5;
    case '肖位类': return ((value % 12) + 12) % 12 || 12;
    case '大小单双类': return ((value % 4) + 4) % 4;
    default: return value;
  }
}

// 扩展结果
function getExpandedResults(result: number, leftExpand: number, rightExpand: number, resultType: string): number[] {
  const results: number[] = [];
  
  if (resultType === '单特类') {
    // 单特类：直接扩展号码
    for (let i = -leftExpand; i <= rightExpand; i++) {
      const expanded = result + i;
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

// 批量验证公式
self.onmessage = (event) => {
  const { type, formulas, historyData, targetPeriod } = event.data;
  
  if (type !== 'verify') return;
  
  try {
    const results: VerifyResult[] = [];
    const BATCH_SIZE = 50;
    
    for (let i = 0; i < formulas.length; i++) {
      const formula = formulas[i];
      
      // 发送进度
      if (i % BATCH_SIZE === 0) {
        self.postMessage({
          type: 'progress',
          current: i,
          total: formulas.length
        });
      }
      
      // 确定验证范围
      let dataToVerify: LotteryData[];
      if (targetPeriod) {
        const targetIdx = historyData.findIndex((d: LotteryData) => d.period === targetPeriod);
        if (targetIdx !== -1) {
          dataToVerify = historyData.slice(targetIdx, targetIdx + formula.periods);
        } else {
          dataToVerify = historyData.slice(0, formula.periods);
        }
      } else {
        dataToVerify = historyData.slice(0, formula.periods);
      }
      
      // 验证
      const hits: boolean[] = [];
      const periodResults: any[] = [];
      
      for (let j = 0; j < dataToVerify.length; j++) {
        const verifyData = dataToVerify[j];
        
        // 找到验证期在完整历史数据中的索引
        const verifyIndex = historyData.findIndex((d: LotteryData) => d.period === verifyData.period);
        
        // 判断是否为预测模式（没有指定targetPeriod）
        const isPredictMode = targetPeriod === null || targetPeriod === undefined;
        const isLatestPeriod = verifyIndex === 0;
        
        let calcData: LotteryData;
        if (isPredictMode && isLatestPeriod) {
          // 预测下一期：用最新期数据计算
          calcData = verifyData;
        } else {
          // 验证历史期（包括指定的最新期）：用上一期数据计算
          calcData = (verifyIndex >= 0 && verifyIndex < historyData.length - 1) 
            ? historyData[verifyIndex + 1] 
            : verifyData;
        }
        
        const rawResult = evaluateExpression(formula.expression, calcData);
        const withOffset = rawResult + formula.offset;
        const cycledResult = applyCycle(withOffset, formula.resultType);
        const expandedResults = getExpandedResults(cycledResult, formula.leftExpand, formula.rightExpand, formula.resultType);
        
        const targetValue = getNumberAttribute(verifyData.numbers[6], formula.resultType, verifyData.zodiacYear);
        const hit = expandedResults.includes(targetValue);
        
        hits.push(hit);
        periodResults.push({
          period: verifyData.period,
          result: cycledResult,
          expandedResults,
          targetValue,
          hit
        });
      }
      
      const hitCount = hits.filter(h => h).length;
      
      // 反转数组，使顺序变为从旧到新（最旧期在前，最新期在后）
      hits.reverse();
      periodResults.reverse();
      
      results.push({
        formula: {
          id: `f_${Date.now()}_${i}`,
          expression: formula.rawExpression,
          rule: formula.rule,
          resultType: formula.resultType,
          offset: formula.offset,
          periods: formula.periods,
          leftExpand: formula.leftExpand,
          rightExpand: formula.rightExpand,
        },
        hits,
        hitCount,
        totalPeriods: dataToVerify.length,
        hitRate: dataToVerify.length > 0 ? hitCount / dataToVerify.length : 0,
        results: periodResults.length > 0 
          ? periodResults[periodResults.length - 1].expandedResults.sort((a: number, b: number) => a - b).map((r: number) => resultToText(r, formula.resultType, historyData[0]?.zodiacYear)) 
          : [],
        periodResults,
        originalLineIndex: (formula as any).originalLineIndex || 0,
        targetPeriod
      });
    }
    
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
