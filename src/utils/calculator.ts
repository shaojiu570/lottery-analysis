import { LotteryData, ResultType, VerifyResult, PeriodResult } from '@/types';
import { calculateElementValue, normalizeElementName } from './elements';
import { applyCycle, getExpandedResults, getNumberAttribute, resultToText, getZodiacMap, getZodiacYearByPeriod } from './mappings';
import { ParsedFormula } from './formulaParser';
import { getCustomElements, getCustomResultTypes } from './storage';
import * as shared from './workerShared';

// ==================== 预计算系统 ====================
// 预计算所有元素的数值表
export type PrecomputedData = shared.PrecomputedData;

// 预计算数据存储
let precomputedDataMap = new Map<number, PrecomputedData[]>();

// 预计算所有历史数据的元素值
export function precomputeAllElementValues(historyData: LotteryData[]): void {
  precomputedDataMap = shared.precomputeAllElementValues(historyData);
}

// 辅助函数：数字各位和
function digitSum(n: number): number {
  return shared.digitSum(n);
}

// 获取预计算的元素值
export function getPrecomputedValue(period: number, element: string, useSort: boolean): number | null {
  const dataList = precomputedDataMap.get(period);
  if (!dataList) return null;
  const data = dataList.find(d => d.useSort === useSort);
  if (!data) return null;
  return data.elementValues[element] ?? null;
}

// ==================== 缓存系统 ====================
// 元素值缓存 - 避免重复计算
const elementValueCache = new Map<string, Map<number, number>>();

function getCachedElementValue(element: string, data: LotteryData, useSort: boolean): number {
  const period = data.period;
  const cacheKey = `${element}_${useSort}`;
  
  // 先尝试从预计算中获取
  const precomputed = getPrecomputedValue(period, element, useSort);
  if (precomputed !== null) {
    return precomputed;
  }
  
  // 尝试从缓存获取
  if (!elementValueCache.has(cacheKey)) {
    elementValueCache.set(cacheKey, new Map());
  }
  
  const periodCache = elementValueCache.get(cacheKey)!;
  if (periodCache.has(period)) {
    return periodCache.get(period)!;
  }
  
  const value = calculateElementValue(element, data, useSort);
  periodCache.set(period, value);
  
  // 限制缓存大小
  if (periodCache.size > 1000) {
    const firstKey = Array.from(periodCache.keys())[0];
    periodCache.delete(firstKey);
  }
  
  return value;
}

// 清除缓存
export function clearCalculationCache(): void {
  elementValueCache.clear();
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

// 计算表达式（使用缓存）
export function evaluateExpression(
  expression: string,
  data: LotteryData,
  useSort: boolean
): number {
  // 1. 先标准化
  let normalized = normalizeElementName(expression);
  
  // 2. 尝试从预计算缓存中获取元素值
  const precomputed = precomputedDataMap.get(data.period);
  const cache = precomputed?.find(p => p.useSort === useSort)?.elementValues;
  
  // 3. 使用共享的评估逻辑
  return shared.evaluateExpression(normalized, data, useSort, getCustomElements(), cache);
}

// 验证单条公式
export function verifyFormula(
  parsed: ParsedFormula,
  historyData: LotteryData[],
  targetPeriod: number | null,
  periods: number,
  leftExpand: number,
  rightExpand: number,
  offset: number
): VerifyResult {
  return shared.verifyFormula(
    parsed,
    historyData,
    targetPeriod,
    periods,
    leftExpand,
    rightExpand,
    offset,
    getCustomElements(),
    getCustomResultTypes(),
    precomputedDataMap
  );
}

// 批量验证公式
export function verifyFormulas(
  parsedFormulas: ParsedFormula[],
  historyData: LotteryData[],
  overrideOffset?: number,
  overridePeriods?: number,
  overrideLeft?: number,
  overrideRight?: number,
  targetPeriod?: number | null
): VerifyResult[] {
  return parsedFormulas.map(f => 
    verifyFormula(f, historyData, overrideOffset, overridePeriods, overrideLeft, overrideRight, targetPeriod)
  );
}

// 统计近10期中每期的命中次数
// 以全码类结果为依据，统计在验证大量不同类型公式时，每期有多少组公式命中特码
export function countHitsPerPeriod(results: VerifyResult[], historyData: LotteryData[]): number[] {
  if (results.length === 0 || historyData.length === 0) return [];
  
  // 获取目标期数（从第一个结果中获取，所有公式应该使用相同的目标期数）
  const targetPeriod = results[0]?.targetPeriod;
  const periods = results[0]?.totalPeriods || 10;
  
  // 获取要统计的期数（最多10期用于显示）
  const displayCount = Math.min(periods, 10);
  let periodsToCount: number[] = [];
  
  if (targetPeriod !== null && targetPeriod !== undefined) {
    // 回溯模式：从目标期数开始向后取periods期
    let startIndex = 0;
    const targetIdx = historyData.findIndex(d => d.period === targetPeriod);
    if (targetIdx !== -1) {
      startIndex = targetIdx;
    }
    
    for (let i = 0; i < displayCount && startIndex + i < historyData.length; i++) {
      periodsToCount.push(historyData[startIndex + i].period);
    }
  } else {
    // 预测模式：统计最近10期历史数据的命中次数
    // 从历史数据中取最新的10期
    const recentHistory = historyData.slice(0, displayCount);
    periodsToCount = recentHistory.map(d => d.period);
  }
  
  // 初始化计数数组
  const counts: number[] = [];
  
  // 对每个期数，统计所有公式命中特码的总次数
  for (const period of periodsToCount) {
    // 找到该期的开奖数据
    const periodData = historyData.find(d => d.period === period);
    if (!periodData) {
      counts.push(0);
      continue;
    }
    
    // 获取该期的实际特码
    const actualTeNum = periodData.numbers[6];
    
    // 统计所有公式在该期的结果转换为号码后，命中特码的总次数
    let hitCount = 0;
    for (const result of results) {
      // 找到该公式在该期的计算结果
      const periodResult = result.periodResults.find(pr => pr.period === period);
      if (periodResult) {
        // 每条公式用自己对应期的period计算生肖年份（与aggregateAllNumbers一致）
        const formulaPeriod = periodResult.period;
        const zodiacYear = getZodiacYearByPeriod(formulaPeriod);
        
        // 将该期的所有扩展结果转换为号码，统计命中特码的次数
        for (const value of periodResult.expandedResults) {
          const numbers = convertResultToNumbers(
            resultToText(value, result.formula.resultType, zodiacYear),
            result.formula.resultType,
            zodiacYear
          );
          for (const num of numbers) {
            if (num === actualTeNum) {
              hitCount++;
            }
          }
        }
      }
    }
    
    counts.push(hitCount);
  }
  
  // 反转数组，让最右边是最新的一期（在指定范围内）
  return counts.reverse();
}

// 按结果类型分组统计（基于历史开奖记录的固定统计）
// 统计历史数据中各结果类型的实际分布情况
export function groupByResultType(
  results: VerifyResult[],
  historyData: LotteryData[] = []
): { countsMap: Map<ResultType, Map<string, number>>, formulaCountByType: Map<ResultType, number> } {
  const grouped = new Map<ResultType, Map<string, number>>();
  const formulaCountByType = new Map<ResultType, number>();

  // 按类型分组公式数量
  const byType = new Map<ResultType, VerifyResult[]>();
  for (const result of results) {
    const type = result.formula.resultType;
    if (!byType.has(type)) {
      byType.set(type, []);
    }
    byType.get(type)!.push(result);
  }

  // 对每个类型统计公式数量
  byType.forEach((typeResults, type) => {
    formulaCountByType.set(type, typeResults.length);
  });

  // 如果没有历史数据，返回空统计
  if (historyData.length === 0) {
    return { countsMap: grouped, formulaCountByType };
  }

  // 确定统计范围：取最近的验证期数或默认最近10期
  const periodsToAnalyze = results.length > 0 ? results[0].totalPeriods : 10;
  const dataToAnalyze = historyData.slice(0, Math.min(periodsToAnalyze, historyData.length));

  // 对每种结果类型，统计历史开奖记录的分布
  const allTypes = Array.from(byType.keys());
  for (const type of allTypes) {
    const typeMap = new Map<string, number>();

    // 初始化所有可能的结果值为0
    const allPossibleValues: string[] = [];
    if (type === '肖位类') {
      for (let i = 1; i <= 12; i++) {
        allPossibleValues.push(resultToText(i, type, 1)); // 使用默认生肖年份
      }
    } else if (type === '单特类') {
      for (let i = 1; i <= 49; i++) {
        allPossibleValues.push(resultToText(i, type, 1));
      }
    } else if (type === '波色类') {
      for (let i = 0; i < 3; i++) {
        allPossibleValues.push(resultToText(i, type, 1));
      }
    } else if (type === '五行类') {
      for (let i = 0; i < 5; i++) {
        allPossibleValues.push(resultToText(i, type, 1));
      }
    } else if (type === '头数类') {
      for (let i = 0; i < 5; i++) {
        allPossibleValues.push(resultToText(i, type, 1));
      }
    } else if (type === '合数类') {
      for (let i = 1; i <= 13; i++) {
        allPossibleValues.push(resultToText(i, type, 1));
      }
    } else if (type === '尾数类') {
      for (let i = 0; i < 10; i++) {
        allPossibleValues.push(resultToText(i, type, 1));
      }
    } else if (type === '大小单双类') {
      for (let i = 0; i < 4; i++) {
        allPossibleValues.push(resultToText(i, type, 1));
      }
    }

    // 初始化计数
    for (const val of allPossibleValues) {
      typeMap.set(val, 0);
    }

    // 统计历史数据中该类型的结果分布
    for (const data of dataToAnalyze) {
      const teNum = data.numbers[6];
      const zodiacYear = data.zodiacYear;
      const attrValue = getNumberAttribute(teNum, type, zodiacYear);
      const attrText = resultToText(attrValue, type, zodiacYear);

      if (typeMap.has(attrText)) {
        typeMap.set(attrText, typeMap.get(attrText)! + 1);
      }
    }

    grouped.set(type, typeMap);
  }

  return { countsMap: grouped, formulaCountByType };
}

// 将结果文字转换回数值
function convertTextToValue(text: string, resultType: ResultType, zodiacYear: number): string {
  // 肖位类：生肖名 -> 号码 -> 号码当结果值
  if (resultType === '肖位类') {
    const zodiacMap = getZodiacMap(zodiacYear);
    const numbers = zodiacMap[text];
    if (numbers && numbers.length > 0) {
      return numbers[0].toString().padStart(2, '0');
    }
  }
  return text;
}

// 全码类结果汇总（使用第四层扩展结果转换号码）
// 验证模式：只统计目标期的结果；预测模式：统计最新期的结果
export function aggregateAllNumbers(results: VerifyResult[]): Map<number, number> {
  const numberCounts = new Map<number, number>();
  
  // 获取所有49个号码的初始计数
  for (let i = 1; i <= 49; i++) {
    numberCounts.set(i, 0);
  }
  
  // 获取目标期数（验证模式）或使用最新期数（预测模式）
  const targetPeriod = results[0]?.targetPeriod;
  const isVerifyMode = targetPeriod !== null && targetPeriod !== undefined;
  
  for (const result of results) {
    const type = result.formula.resultType;
    
    // 根据模式选择要统计的期数结果
    let periodsToCount: any[] = [];
    
    if (isVerifyMode) {
      // 验证模式：只统计目标期的结果
      periodsToCount = result.periodResults.filter(pr => pr.period === targetPeriod);
    } else {
      // 预测模式：只统计最新期的结果（第一个periodResult）
      if (result.periodResults.length > 0) {
        periodsToCount = [result.periodResults[0]];
      }
    }
    
    // 统计选定期数的结果
    for (const periodResult of periodsToCount) {
      // 使用该期数的期数计算对应的生肖年份
      const zodiacYear = getZodiacYearByPeriod(periodResult.period);
      
      // 使用第四层的扩展结果来转换号码（与countHitsPerPeriod保持一致）
      for (const value of periodResult.expandedResults) {
        // 将结果字符串转换为号码（使用该期数对应的生肖年份）
        const numbers = convertResultToNumbers(
          resultToText(value, type, zodiacYear),
          type,
          zodiacYear
        );
        for (const num of numbers) {
          numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
        }
      }
    }
  }
  
  return numberCounts;
}

// 将结果字符串转换为号码列表
function convertResultToNumbers(resultStr: string, resultType: ResultType, zodiacYear?: number): number[] {
  // 去掉星号
  const cleanStr = resultStr.replace('★', '');
  
  // 肖位类：如 "鸡" -> 转换为号码
  if (resultType === '肖位类') {
    const zodiacMap = getZodiacMap(zodiacYear);
    const nums = zodiacMap[cleanStr];
    return nums || [];
  }
  
  // 波色类：如 "红波" -> 转换为对应号码
  if (resultType === '波色类') {
    const waveMap: Record<string, number> = {
      '红波': 0, '蓝波': 1, '绿波': 2
    };
    const value = waveMap[cleanStr];
    if (value !== undefined) {
      return getNumbersFromResult(value, resultType, zodiacYear);
    }
    return [];
  }
  
  // 五行类：如 "金" -> 转换为对应号码
  if (resultType === '五行类') {
    const elementMap: Record<string, number> = {
      '金': 0, '木': 1, '水': 2, '火': 3, '土': 4
    };
    const value = elementMap[cleanStr];
    if (value !== undefined) {
      return getNumbersFromResult(value, resultType, zodiacYear);
    }
    return [];
  }
  
  // 大小单双类：如 "大单" -> 转换为对应号码
  if (resultType === '大小单双类') {
    const valueMap: Record<string, number> = {
      '小单': 0, '小双': 1, '大单': 2, '大双': 3
    };
    const value = valueMap[cleanStr];
    if (value !== undefined) {
      return getNumbersFromResult(value, resultType, zodiacYear);
    }
    return [];
  }
  
  // 自定义类型
  const customTypes = getCustomResultTypes();
  const ct = customTypes.find(t => t.name === resultType);
  if (ct) {
    const index = ct.mappings.findIndex(m => m.label === cleanStr);
    if (index !== -1) {
      return getNumbersFromResult(index, resultType, zodiacYear);
    }
  }
  
  // 其他类型：解析数字后转换
  const numMatch = cleanStr.match(/^(\d+)/);
  if (numMatch) {
    const value = parseInt(numMatch[1]);
    return getNumbersFromResult(value, resultType, zodiacYear);
  }
  
  return [];
}

// 根据结果值获取号码列表
function getNumbersFromResult(value: number, resultType: ResultType, zodiacYear?: number): number[] {
  const numbers: number[] = [];
  for (let i = 1; i <= 49; i++) {
    if (getNumberAttribute(i, resultType, zodiacYear) === value) {
      numbers.push(i);
    }
  }
  return numbers;
}
