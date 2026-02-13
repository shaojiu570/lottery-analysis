import { LotteryData, ResultType, SearchStrategy } from '@/types';
import { getAllElements } from './elements';
import { verifyFormula } from './calculator';
import { parseFormula } from './formulaParser';

export interface SearchResult {
  formula: string;
  hitRate: number;
  hitCount: number;
  totalPeriods: number;
}

// 生成随机公式
function generateRandomFormula(
  elements: string[],
  elementCount: number,
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number
): string {
  const shuffled = [...elements].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(elementCount, elements.length));
  
  // 随机生成表达式
  let expression = selected[0];
  for (let i = 1; i < selected.length; i++) {
    const ops = ['+', '-', '+', '+'];  // 加法权重更高
    const op = ops[Math.floor(Math.random() * ops.length)];
    expression += op + selected[i];
  }
  
  return `[${rule}${resultType}]${expression}=${periods}`;
}

// 智能搜索
export async function smartSearch(
  historyData: LotteryData[],
  targetHitRate: number,
  maxCount: number,
  strategy: SearchStrategy,
  resultTypes: ResultType[],
  offset: number,
  periods: number,
  leftExpand: number,
  rightExpand: number,
  onProgress?: (current: number, total: number) => void
): Promise<SearchResult[]> {
  const elements = getAllElements();
  const results: SearchResult[] = [];
  const seenFormulas = new Set<string>();
  
  // 根据策略确定元素数量范围
  let minElements: number, maxElements: number, iterations: number;
  switch (strategy) {
    case 'fast':
      minElements = 1;
      maxElements = 10;
      iterations = Math.min(maxCount * 10, 5000);
      break;
    case 'standard':
      minElements = 1;
      maxElements = 15;
      iterations = Math.min(maxCount * 20, 10000);
      break;
    case 'deep':
      minElements = 1;
      maxElements = 20;
      iterations = Math.min(maxCount * 30, 20000);
      break;
    default:
      minElements = 1;
      maxElements = 10;
      iterations = 5000;
  }
  
  const rules: ('D' | 'L')[] = ['D', 'L'];
  let processed = 0;
  
  for (let i = 0; i < iterations && results.length < maxCount; i++) {
    const resultType = resultTypes[Math.floor(Math.random() * resultTypes.length)];
    const rule = rules[Math.floor(Math.random() * rules.length)];
    const elementCount = Math.floor(Math.random() * (maxElements - minElements + 1)) + minElements;
    
    const formulaStr = generateRandomFormula(elements, elementCount, resultType, rule, periods);
    
    if (seenFormulas.has(formulaStr)) continue;
    seenFormulas.add(formulaStr);
    
    const parsed = parseFormula(formulaStr);
    if (!parsed) continue;
    
    const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
    
    // 检查命中率是否符合目标
    const hitRate = result.hitRate * 100;
    const tolerance = 5; // 5%容差
    
    if (Math.abs(hitRate - targetHitRate) <= tolerance || 
        (targetHitRate === 0 && hitRate === 0) ||
        (targetHitRate === 100 && hitRate === 100)) {
      results.push({
        formula: formulaStr,
        hitRate: result.hitRate,
        hitCount: result.hitCount,
        totalPeriods: result.totalPeriods,
      });
    }
    
    processed++;
    if (onProgress && processed % 100 === 0) {
      onProgress(processed, iterations);
      // 让出主线程
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  // 按命中率排序
  if (targetHitRate >= 50) {
    results.sort((a, b) => b.hitRate - a.hitRate);
  } else {
    results.sort((a, b) => a.hitRate - b.hitRate);
  }
  
  return results.slice(0, maxCount);
}
