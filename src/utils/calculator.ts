import { LotteryData, ResultType, VerifyResult, PeriodResult } from '@/types';
import { calculateElementValue, normalizeElementName } from './elements';
import { applyCycle, getExpandedResults, getNumberAttribute, resultToText } from './mappings';
import { ParsedFormula } from './formulaParser';

// 计算表达式
export function evaluateExpression(
  expression: string,
  data: LotteryData,
  useSort: boolean
): number {
  let normalized = normalizeElementName(expression);
  
  // 替换运算符
  normalized = normalized.replace(/×/g, '*').replace(/÷/g, '%');
  
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
  
  // 安全计算表达式
  try {
    // 只允许数字和基本运算符
    if (!/^[\d+\-*%().\s]+$/.test(normalized)) {
      console.error('Invalid expression:', normalized);
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
    
    // 用前一期数据计算（索引+1，因为历史数据按时间倒序）
    const calcData = (verifyIndex >= 0 && verifyIndex + 1 < historyData.length) 
      ? historyData[verifyIndex + 1] 
      : verifyData;
    
    // 计算表达式值
    const rawResult = evaluateExpression(parsed.expression, calcData, useSort);
    // 加补偿值
    const withOffset = rawResult + offset;
    // 应用循环规则
    const cycledResult = applyCycle(withOffset, parsed.resultType);
    // 获取扩展结果
    const expandedResults = getExpandedResults(cycledResult, leftExpand, rightExpand, parsed.resultType);
    
    // 获取特码的属性值
    const teNum = verifyData.numbers[6];
    const targetValue = getNumberAttribute(teNum, parsed.resultType);
    
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
  
  // 只取最新一期的结果
  const latestResults = periodResults.length > 0 
    ? periodResults[0].expandedResults 
    : [];
  const results = Array.from(latestResults).sort((a, b) => a - b).map(v => resultToText(v, parsed.resultType));
  
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

// 统计每期命中公式数
export function countHitsPerPeriod(results: VerifyResult[], historyData: LotteryData[]): number[] {
  if (results.length === 0 || historyData.length === 0) return [];
  
  // 取最近10期开奖数据（固定范围）
  const recentPeriods = historyData.slice(0, 10).map(d => d.period);
  const counts: number[] = new Array(10).fill(0);
  
  // 对于每个公式，找到对应期数的命中情况
  for (const result of results) {
    // periodResults 包含了该公式验证的所有期数详情
    for (const pr of result.periodResults) {
      // 找到这个期数在固定范围中的位置
      const index = recentPeriods.indexOf(pr.period);
      if (index !== -1 && pr.hit) {
        counts[index]++;
      }
    }
  }
  
  // 反转数组，让最右边是最新的一期（索引0是最新期）
  return counts.reverse();
}

// 按结果类型分组统计（只统计同类公式的最新一期结果）
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
    // 记录该类型的公式数量
    formulaCountByType.set(type, typeResults.length);
    
    const typeMap = new Map<string, number>();
    
    // 获取该类型的所有可能结果值
    const allPossibleValues: string[] = [];
    if (type === '肖位类') {
      for (let i = 1; i <= 12; i++) {
        allPossibleValues.push(resultToText(i, type));
      }
    } else if (type === '单特类') {
      for (let i = 1; i <= 49; i++) {
        allPossibleValues.push(resultToText(i, type));
      }
    } else if (type === '波色类') {
      for (let i = 0; i < 3; i++) {
        allPossibleValues.push(resultToText(i, type));
      }
    } else if (type === '五行类') {
      for (let i = 0; i < 5; i++) {
        allPossibleValues.push(resultToText(i, type));
      }
    } else if (type === '头数类') {
      for (let i = 0; i < 5; i++) {
        allPossibleValues.push(resultToText(i, type));
      }
    } else if (type === '合数类') {
      for (let i = 0; i < 14; i++) {
        allPossibleValues.push(resultToText(i, type));
      }
    } else if (type === '尾数类') {
      for (let i = 0; i < 10; i++) {
        allPossibleValues.push(resultToText(i, type));
      }
    }
    
    // 统计每个结果在同类公式中出现的次数
    for (const val of allPossibleValues) {
      let count = 0;
      for (const r of typeResults) {
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

// 全码类结果汇总（包含0次的号码）
export function aggregateAllNumbers(results: VerifyResult[]): Map<number, number> {
  const numberCounts = new Map<number, number>();
  
  // 获取所有49个号码的初始计数
  for (let i = 1; i <= 49; i++) {
    numberCounts.set(i, 0);
  }
  
  for (const result of results) {
    const type = result.formula.resultType;
    
    // 获取最新一期的扩展结果
    if (result.periodResults.length > 0) {
      const latestResult = result.periodResults[0];
      
      for (const value of latestResult.expandedResults) {
        // 将结果值转换为号码
        const numbers = getNumbersFromResult(value, type);
        for (const num of numbers) {
          numberCounts.set(num, (numberCounts.get(num) || 0) + 1);
        }
      }
    }
  }
  
  return numberCounts;
}

// 根据结果值获取号码列表
function getNumbersFromResult(value: number, resultType: ResultType): number[] {
  const numbers: number[] = [];
  for (let i = 1; i <= 49; i++) {
    if (getNumberAttribute(i, resultType) === value) {
      numbers.push(i);
    }
  }
  return numbers;
}
