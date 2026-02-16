// 验证 Worker - 将计算移到后台线程
import type { LotteryData, VerifyResult } from '../types';
import type { ParsedFormula } from '../utils/formulaParser';

// 简化的元素计算（Worker中无法导入完整模块）
function calculateElementValue(element: string, data: LotteryData): number {
  // 实现简化的元素计算逻辑
  // 这里需要复制 calculator.ts 中的核心逻辑
  
  // 期数系列
  if (element === '期数') return data.period % 100;
  if (element === '期数尾') return data.period % 10;
  if (element === '期数合') {
    const sum = String(data.period).split('').reduce((a, b) => a + parseInt(b), 0);
    return sum;
  }
  
  // 特码系列
  const teNum = data.numbers[6];
  if (element === '特号') return teNum;
  if (element === '特尾') return teNum % 10;
  if (element === '特头') return Math.floor(teNum / 10);
  if (element === '特合') {
    const sum = String(teNum).split('').reduce((a, b) => a + parseInt(b), 0);
    return sum;
  }
  
  return 0;
}

// 评估表达式 - 只允许加号
function evaluateExpression(expression: string, data: LotteryData): number {
  let normalized = expression;
  
  // 替换元素为数值
  const elements = ['期数', '期数尾', '期数合', '特号', '特尾', '特头', '特合'];
  for (const elem of elements) {
    const value = calculateElementValue(elem, data);
    normalized = normalized.replace(new RegExp(elem, 'g'), value.toString());
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
    case '肖位类': return ((value % 12) + 12) % 12 || 12;
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
        const calcData = j > 0 ? dataToVerify[j - 1] : verifyData;
        
        const rawResult = evaluateExpression(formula.expression, calcData);
        const withOffset = rawResult + formula.offset;
        const cycledResult = applyCycle(withOffset, formula.resultType);
        const expandedResults = getExpandedResults(cycledResult, formula.leftExpand, formula.rightExpand, formula.resultType);
        
        // 简化命中判断（实际应该用完整的属性映射）
        const hit = expandedResults.includes(verifyData.numbers[6]);
        
        hits.push(hit);
        periodResults.push({
          period: verifyData.period,
          result: cycledResult,
          expandedResults,
          targetValue: verifyData.numbers[6],
          hit
        });
      }
      
      const hitCount = hits.filter(h => h).length;
      
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
        results: periodResults.length > 0 ? periodResults[0].expandedResults.map((r: number) => String(r)) : [],
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
