// 验证 Worker - 在后台线程处理公式验证
// 避免大量公式验证时阻塞 UI

import { ParsedFormula, LotteryData, VerifyResult } from './types';

// 从 calculator.ts 复制必要的验证逻辑
function evaluateExpression(
  expression: string,
  data: LotteryData,
  useSort: boolean
): number {
  let normalized = expression;
  
  // 这里需要实现完整的表达式计算逻辑
  // 由于 Worker 中无法直接导入模块，我们需要内联实现
  
  // 简化版本：只支持基本运算符和数字
  // 实际应用中需要完整的元素替换逻辑
  try {
    // eslint-disable-next-line no-eval
    return Math.floor(eval(normalized));
  } catch (e) {
    return 0;
  }
}

// 批量验证公式
function verifyFormulasBatch(
  formulas: ParsedFormula[],
  historyData: LotteryData[],
  targetPeriod: number | null
): VerifyResult[] {
  const results: VerifyResult[] = [];
  
  for (let i = 0; i < formulas.length; i++) {
    const formula = formulas[i];
    
    // 发送进度更新
    if (i % 10 === 0) {
      self.postMessage({
        type: 'progress',
        current: i,
        total: formulas.length
      });
    }
    
    // 简化的验证逻辑
    // 实际应该调用完整的 verifyFormula 逻辑
    const result: VerifyResult = {
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
      hits: [],
      hitCount: 0,
      totalPeriods: formula.periods,
      hitRate: 0,
      results: [],
      periodResults: [],
      originalLineIndex: (formula as unknown as { originalLineIndex: number }).originalLineIndex || 0,
      targetPeriod,
    };
    
    results.push(result);
  }
  
  return results;
}

// Worker 消息处理
self.onmessage = (event) => {
  const { type, formulas, historyData, targetPeriod } = event.data;
  
  if (type === 'verify') {
    try {
      const results = verifyFormulasBatch(formulas, historyData, targetPeriod);
      
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
  }
};

export {};
