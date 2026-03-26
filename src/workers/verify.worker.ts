// 验证 Worker - 将计算移到后台线程
import type { LotteryData, VerifyResult, CustomElement, CustomResultType, AliasMapping } from '../types';
import * as shared from '../utils/workerShared';

// ==================== Worker缓存系统 ====================
// 存储自定义数据
let workerCustomElements: CustomElement[] = [];
let workerCustomResultTypes: CustomResultType[] = [];
let workerAliases: AliasMapping = {};
let precomputedDataMap = new Map<number, shared.PrecomputedData[]>();

// 预计算所有历史数据的元素值
function precomputeAllElementValues(historyData: LotteryData[]): void {
  precomputedDataMap = shared.precomputeAllElementValues(historyData);
}

// 批量验证公式
self.onmessage = async (event) => {
  const { 
    type, 
    formulas, 
    historyData, 
    targetPeriod,
    customElements,
    customResultTypes,
    aliases
  } = event.data;
  
  if (type === 'precompute' && historyData) {
    // 更新自定义数据
    if (customElements) workerCustomElements = customElements;
    if (customResultTypes) workerCustomResultTypes = customResultTypes;
    if (aliases) workerAliases = aliases;
    
    // 预计算阶段
    precomputeAllElementValues(historyData);
    self.postMessage({ type: 'precomputeComplete' });
    return;
  }
  
  if (type !== 'verify') return;
  
  // 更新自定义数据
  if (customElements) workerCustomElements = customElements;
  if (customResultTypes) workerCustomResultTypes = customResultTypes;
  if (aliases) workerAliases = aliases;
  
  // 先预计算
  if (historyData && historyData.length > 0) {
    precomputeAllElementValues(historyData);
  }
  
  try {
    const results: any[] = [];
    const BATCH_SIZE = 50; // 提高批处理效率
    
    for (let i = 0; i < formulas.length; i += BATCH_SIZE) {
      const batch = formulas.slice(i, i + BATCH_SIZE);
      
      for (const formula of batch) {
        const result = shared.verifyFormula(
          formula,
          historyData,
          targetPeriod,
          formula.periods || 15,
          formula.leftExpand || 0,
          formula.rightExpand || 0,
          formula.offset || 0,
          workerCustomElements,
          workerCustomResultTypes,
          precomputedDataMap
        );
        results.push({
          ...result,
          originalLineIndex: formula.originalLineIndex ?? 0
        });
      }
      
      // 发送进度
      self.postMessage({
        type: 'progress',
        current: Math.min(i + BATCH_SIZE, formulas.length),
        total: formulas.length
      });
      
      // 给主线程喘息机会
      await new Promise(resolve => setTimeout(resolve, 0));
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
