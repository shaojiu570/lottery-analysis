import { LotteryData, ResultType, VerifyResult, PeriodResult } from '@/types';
import { calculateElementValue, normalizeElementName } from './elements';
import { applyCycle, getExpandedResults, getNumberAttribute, resultToText, getZodiacMap, getZodiacYearByPeriod } from './mappings';
import { ParsedFormula } from './formulaParser';

// 元素值缓存 - 避免重复计算
const elementValueCache = new Map<string, Map<number, number>>();

function getCachedElementValue(element: string, data: LotteryData, useSort: boolean): number {
  const period = data.period;
  const cacheKey = `${element}_${useSort}`;
  
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

// 计算表达式
export function evaluateExpression(
  expression: string,
  data: LotteryData,
  useSort: boolean
): number {
  let normalized = normalizeElementName(expression);
  
  // 将其他运算符替换为空或移除（只允许加号）
  normalized = normalized.replace(/[×\*÷\/%\-]/g, '');
  
  // 替换元素为数值
  // 期数系列（按长度优先）
  const periodElements = ['期数合尾', '期数合', '期数尾', '期数'];
  for (const elem of periodElements) {
    const value = calculateElementValue(elem, data, useSort);
    normalized = normalized.replace(new RegExp(elem, 'g'), value.toString());
  }
  
  // 总分系列（按长度优先）
  const totalElements = ['总分合尾', '总分合', '总分尾', '总分'];
  for (const elem of totalElements) {
    const value = calculateElementValue(elem, data, useSort);
    normalized = normalized.replace(new RegExp(elem, 'g'), value.toString());
  }
  
  // 平码系列（按属性长度优先）
  const pingAttrs = ['合头', '合尾', '肖位', '号', '头', '尾', '合', '波', '段', '行'];
  for (let i = 1; i <= 6; i++) {
    for (const attr of pingAttrs) {
      const elem = `平${i}${attr}`;
      const value = calculateElementValue(elem, data, useSort);
      normalized = normalized.replace(new RegExp(elem, 'g'), value.toString());
    }
  }
  
  // 特码系列（按属性长度优先）
  const teAttrs = ['合头', '合尾', '肖位', '号', '头', '尾', '合', '波', '段', '行'];
  for (const attr of teAttrs) {
    const elem = `特${attr}`;
    const value = calculateElementValue(elem, data, useSort);
    normalized = normalized.replace(new RegExp(elem, 'g'), value.toString());
  }
  
  // 处理单独的"特"字（视为特号）
  const teValue = calculateElementValue('特号', data, useSort);
  normalized = normalized.replace(/特(?!合|头|尾|肖|号|波|段|行)/g, teValue.toString());
  
  // 安全计算表达式 - 只允许加号
  try {
    // 只允许数字、加号和括号
    if (!/^[\d+().\s]+$/.test(normalized)) {
      console.error('Invalid expression (only + allowed):', normalized);
      return 0;
    }
    // eslint-disable-next-line no-eval
    return Math.floor(eval(normalized));
  } catch (e) {
    console.error('Expression evaluation error:', e);
    return 0;
  }
}

// 验证公式
export function verifyFormula(
  parsed: ParsedFormula,
  historyData: LotteryData[],
  overrideOffset?: number,
  overridePeriods?: number,
  overrideLeft?: number,
  overrideRight?: number,
  targetPeriod?: number | null
): VerifyResult {
  const offset = overrideOffset ?? parsed.offset;
  const periods = overridePeriods ?? parsed.periods;
  const leftExpand = overrideLeft ?? parsed.leftExpand;
  const rightExpand = overrideRight ?? parsed.rightExpand;
  
  let dataToVerify: LotteryData[];
  
  if (targetPeriod) {
    // 找到目标期数的索引
    const targetIndex = historyData.findIndex(d => d.period === targetPeriod);
    if (targetIndex === -1) {
      // 未找到目标期数，使用最新期数
      dataToVerify = historyData.slice(0, periods);
    } else {
      // 从目标期数开始取N期（包括目标期及之后的期数）
      // 例如目标期2026043，取[2026043, 2026042, 2026041...]
      dataToVerify = historyData.slice(targetIndex, targetIndex + periods);
    }
  } else {
    // 取最近N期数据
    dataToVerify = historyData.slice(0, periods);
  }
  const useSort = parsed.rule === 'D';
  
  const periodResults: PeriodResult[] = [];
  const hits: boolean[] = [];
  const allResults = new Set<number>();
  
    for (let i = 0; i < dataToVerify.length; i++) {
      const verifyData = dataToVerify[i];
      
      // 找到验证期数在历史数据中的索引
      const verifyIndex = historyData.findIndex(d => d.period === verifyData.period);
      
      // 判断是否为预测模式（没有指定targetPeriod）
      const isPredictMode = targetPeriod === null || targetPeriod === undefined;
      const isLatestPeriod = verifyIndex === 0;
      
      let calcData: LotteryData;
      if (isPredictMode && isLatestPeriod) {
        // 预测下一期：用最新期数据计算
        calcData = verifyData;
      } else {
        // 验证历史期（包括指定的最新期）：用上一期数据计算
        // 历史数据是降序排列（最新在前），所以用 verifyIndex - 1 获取上一期
        calcData = (verifyIndex > 0 && verifyIndex < historyData.length) 
          ? historyData[verifyIndex - 1] 
          : verifyData;
      }
    
    // 计算表达式值
    const rawResult = evaluateExpression(parsed.expression, calcData, useSort);
    // 加补偿值
    const withOffset = rawResult + offset;
    // 应用循环规则
    const cycledResult = applyCycle(withOffset, parsed.resultType);
    
    // 获取扩展结果
    const expandedResults = getExpandedResults(cycledResult, leftExpand, rightExpand, parsed.resultType);
    
    // 获取特码的属性值（用验证期的特码来判断命中，而不是计算期）
    const teNum = verifyData.numbers[6];
    const targetValue = getNumberAttribute(teNum, parsed.resultType, verifyData.zodiacYear);
    
    // 判断是否命中
    const hit = expandedResults.includes(targetValue);
    
    periodResults.push({
      period: verifyData.period,
      result: cycledResult,
      expandedResults,
      targetValue,
      hit,
    });
    
    hits.push(hit);
    expandedResults.forEach(r => allResults.add(r));
  }
  
    const hitCount = hits.filter(h => h).length;
  
  // 反转数组，使顺序变为从旧到新（最旧期在前，最新期在后）
  hits.reverse();
  periodResults.reverse();
  
  // 只取最新一期的结果（反转后periodResults[length-1]是最新的）
  const latestResults = periodResults.length > 0 
    ? periodResults[periodResults.length - 1].expandedResults 
    : [];
  const latestZodiacYear = historyData.length > 0 ? historyData[0].zodiacYear : undefined;
  const results = Array.from(latestResults).sort((a, b) => a - b).map(v => resultToText(v, parsed.resultType, latestZodiacYear));
  
  return {
    formula: {
      id: `f_${Date.now()}`,
      expression: parsed.rawExpression,
      rule: parsed.rule,
      resultType: parsed.resultType,
      offset,
      periods,
      leftExpand,
      rightExpand,
    },
    hits,
    hitCount,
    totalPeriods: dataToVerify.length,
    hitRate: dataToVerify.length > 0 ? hitCount / dataToVerify.length : 0,
    results,
    periodResults,
    originalLineIndex: (parsed as { originalLineIndex?: number }).originalLineIndex ?? 0,
    targetPeriod: targetPeriod || null,
  };
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

// 统计每期实际特码被多少公式命中
export function countHitsPerPeriod(results: VerifyResult[], historyData: LotteryData[]): number[] {
  if (results.length === 0 || historyData.length === 0) return [];
  
  // 获取目标期数（从第一个结果中获取，所有公式应该使用相同的目标期数）
  const targetPeriod = results[0]?.targetPeriod;
  const periods = results[0]?.totalPeriods || 10;
  
  // 确定统计范围：从目标期数开始向后取periods期
  let startIndex = 0;
  if (targetPeriod) {
    const targetIdx = historyData.findIndex(d => d.period === targetPeriod);
    if (targetIdx !== -1) {
      startIndex = targetIdx;
    }
  }
  
  // 获取要统计的期数（最多10期用于显示）
  const displayCount = Math.min(periods, 10);
  const periodsToCount: number[] = [];
  for (let i = 0; i < displayCount && startIndex + i < historyData.length; i++) {
    periodsToCount.push(historyData[startIndex + i].period);
  }
  
  // 初始化计数数组
  const counts: number[] = [];
  
  // 对每个期数，统计实际特码被多少公式命中
  for (const period of periodsToCount) {
    // 找到该期的开奖数据
    const periodData = historyData.find(d => d.period === period);
    if (!periodData) {
      counts.push(0);
      continue;
    }
    
    // 获取该期的实际特码
    const actualTeNum = periodData.numbers[6];
    
    // 统计有多少公式的结果包含这个特码
    let hitCount = 0;
    for (const result of results) {
      // 找到该公式在该期的计算结果
      const periodResult = result.periodResults.find(pr => pr.period === period);
      if (periodResult) {
        // 将该期的所有扩展结果转换为号码
        for (const value of periodResult.expandedResults) {
          const numbers = getNumbersFromResult(value, result.formula.resultType);
          if (numbers.includes(actualTeNum)) {
            hitCount++;
            break; // 该公式已命中，不再重复计数
          }
        }
      }
    }
    
    counts.push(hitCount);
  }
  
  // 反转数组，让最右边是最新的一期（在指定范围内）
  return counts.reverse();
}

// 按结果类型分组统计（只统计同类公式的最新一期结果）
// 每条公式根据自己最新一期的期数计算对应的生肖年份
export function groupByResultType(
  results: VerifyResult[]
): { countsMap: Map<ResultType, Map<string, number>>, formulaCountByType: Map<ResultType, number> } {
  const grouped = new Map<ResultType, Map<string, number>>();
  const formulaCountByType = new Map<ResultType, number>();
  
  // 按类型分组
  const byType = new Map<ResultType, VerifyResult[]>();
  for (const result of results) {
    const type = result.formula.resultType;
    if (!byType.has(type)) {
      byType.set(type, []);
    }
    byType.get(type)!.push(result);
  }
  
  // 对每个类型统计
  byType.forEach((typeResults, type) => {
    formulaCountByType.set(type, typeResults.length);
    
    const typeMap = new Map<string, number>();
    
    // 生成该类型所有可能结果值时使用的生肖年份
    // 使用第一条公式的期数作为代表（用于生成所有可能值）
    const sampleResult = typeResults[0];
    const samplePeriod = sampleResult.periodResults[sampleResult.periodResults.length - 1]?.period || 0;
    const sampleZodiacYear = getZodiacYearByPeriod(samplePeriod);
    
    // 获取该类型的所有可能结果值
    const allPossibleValues: string[] = [];
    if (type === '肖位类') {
      for (let i = 1; i <= 12; i++) {
        allPossibleValues.push(resultToText(i, type, sampleZodiacYear));
      }
    } else if (type === '单特类') {
      for (let i = 1; i <= 49; i++) {
        allPossibleValues.push(resultToText(i, type, sampleZodiacYear));
      }
    } else if (type === '波色类') {
      for (let i = 0; i < 3; i++) {
        allPossibleValues.push(resultToText(i, type, sampleZodiacYear));
      }
    } else if (type === '五行类') {
      for (let i = 0; i < 5; i++) {
        allPossibleValues.push(resultToText(i, type, sampleZodiacYear));
      }
    } else if (type === '头数类') {
      for (let i = 0; i < 5; i++) {
        allPossibleValues.push(resultToText(i, type, sampleZodiacYear));
      }
    } else if (type === '合数类') {
      for (let i = 0; i < 14; i++) {
        allPossibleValues.push(resultToText(i, type, sampleZodiacYear));
      }
    } else if (type === '尾数类') {
      for (let i = 0; i < 10; i++) {
        allPossibleValues.push(resultToText(i, type, sampleZodiacYear));
      }
    } else if (type === '大小单双类') {
      for (let i = 0; i < 4; i++) {
        allPossibleValues.push(resultToText(i, type, sampleZodiacYear));
      }
    }
    
    // 统计每个结果在同类公式中出现的次数
    // 每条公式根据自己最新一期的期数计算生肖年份
    for (const val of allPossibleValues) {
      let count = 0;
      for (const r of typeResults) {
        // 获取该公式最新一期的期数，计算对应的生肖年份
        const period = r.periodResults[r.periodResults.length - 1]?.period || 0;
        const zodiacYear = getZodiacYearByPeriod(period);
        
        // 直接比较，因为 allPossibleValues 和 r.results 都是用同样的逻辑生成的
        if (r.results.includes(val)) {
          count++;
        }
      }
      typeMap.set(val, count);
    }
    
    grouped.set(type, typeMap);
  });
  
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

// 全码类结果汇总（直接使用第三层结果转换号码）
// 每条公式根据自己最新一期的期数计算对应的生肖年份
export function aggregateAllNumbers(results: VerifyResult[]): Map<number, number> {
  const numberCounts = new Map<number, number>();
  
  // 获取所有49个号码的初始计数
  for (let i = 1; i <= 49; i++) {
    numberCounts.set(i, 0);
  }
  
  for (const result of results) {
    const type = result.formula.resultType;
    
    // 获取该公式最新一期的期数，计算对应的生肖年份
    const period = result.periodResults[result.periodResults.length - 1]?.period || 0;
    const zodiacYear = getZodiacYearByPeriod(period);
    
    // 直接使用第三层的结果字符串来转换号码
    for (const resultStr of result.results) {
      // 将结果字符串转换为号码（使用该公式对应期的生肖年份）
      const numbers = convertResultToNumbers(resultStr, type, zodiacYear);
      for (const num of numbers) {
        numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
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
