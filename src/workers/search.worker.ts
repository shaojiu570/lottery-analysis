// 优化的智能搜索 Worker - 包含模式学习和改进策略
import type { LotteryData, ResultType } from '../types';
import { getAllElements } from '../utils/elements';
import { parseFormula } from '../utils/formulaParser';
import { verifyFormula } from '../utils/calculator';

// ==================== 元素分组定义 ====================
const ELEMENT_GROUPS = {
  期数组: ['期数', '期数尾', '期数合', '期数合尾', '上期数'],
  总分组: ['总分', '总分尾', '总分合', '总分合尾'],
  尾数组: ['平1尾', '平2尾', '平3尾', '平4尾', '平5尾', '平6尾', '特尾'],
  头数组: ['平1头', '平2头', '平3头', '平4头', '平5头', '平6头', '特头'],
  合数组: ['平1合', '平2合', '平3合', '平4合', '平5合', '平6合', '特合', '期数合', '总分合'],
  波数组: ['平1波', '平2波', '平3波', '平4波', '平5波', '平6波', '特波'],
  行数组: ['平1行', '平2行', '平3行', '平4行', '平5行', '平6行', '特行'],
  段数组: ['平1段', '平2段', '平3段', '平4段', '平5段', '平6段', '特段'],
  肖位数组: ['平1肖位', '平2肖位', '平3肖位', '平4肖位', '平5肖位', '平6肖位', '特肖位'],
  号数组: ['平1号', '平2号', '平3号', '平4号', '平5号', '平6号', '特号'],
  外部数据组: ['星期', '干', '支', '干支'],  // 新增：外部数据元素
};

// 结果类型与元素组的映射
const RESULT_TYPE_ELEMENT_MAP: Record<ResultType, string[]> = {
  '尾数类': ['尾数组', '期数组', '合数组', '外部数据组'],
  '头数类': ['头数组', '期数组', '外部数据组'],
  '合数类': ['合数组', '期数组', '总分组', '外部数据组'],
  '波色类': ['波数组', '期数组', '外部数据组'],
  '五行类': ['行数组', '期数组', '外部数据组'],
  '肖位类': ['肖位数组', '期数组', '外部数据组'],
  '单特类': ['号数组', '期数组', '总分组', '外部数据组'],
  '大小单双类': ['尾数组', '合数组', '段数组', '期数组', '外部数据组'],
};

// 获取推荐元素（核心元素）
function getRecommendedElements(resultType: ResultType): string[] {
  const groups = RESULT_TYPE_ELEMENT_MAP[resultType] || [];
  const elements: string[] = [];
  for (const group of groups) {
    elements.push(...(ELEMENT_GROUPS[group as keyof typeof ELEMENT_GROUPS] || []));
  }
  return [...new Set(elements)];
}

// 获取所有可用元素（包括推荐和其他元素）
function getAllAvailableElements(resultType: ResultType): string[] {
  const recommended = getRecommendedElements(resultType);
  const allElements = getAllElements();
  
  // 推荐元素在前，其他元素在后
  const otherElements = allElements.filter(e => !recommended.includes(e));
  return [...recommended, ...otherElements];
}

// ==================== 模式学习系统 ====================
interface ElementPattern {
  element: string;
  avgHitRate: number;
  frequency: number;
  bestPairs: string[];
}

interface FormulaPattern {
  elementCount: number;
  avgHitRate: number;
  commonElements: string[];
  elementPairs: Map<string, number>;
}

// 模式学习缓存
const patternCache = new Map<string, FormulaPattern>();

// 学习历史公式的模式
function learnPatterns(
  results: Array<{ formula: string; hitRate: number }>,
  minHitRate: number = 0.5
): FormulaPattern {
  const highHitFormulas = results.filter(r => r.hitRate >= minHitRate);
  
  if (highHitFormulas.length === 0) {
    return {
      elementCount: 3,
      avgHitRate: 0,
      commonElements: [],
      elementPairs: new Map(),
    };
  }
  
  const elementFreq = new Map<string, number>();
  const pairFreq = new Map<string, number>();
  let totalElements = 0;
  let totalHitRate = 0;
  
  for (const result of highHitFormulas) {
    const parsed = parseFormula(result.formula);
    if (!parsed) continue;
    
    // 提取元素
    const elements = parsed.expression.split(/[+\-]/).filter(e => e.trim());
    totalElements += elements.length;
    totalHitRate += result.hitRate;
    
    // 统计元素频率
    for (const elem of elements) {
      elementFreq.set(elem, (elementFreq.get(elem) || 0) + 1);
    }
    
    // 统计元素对频率
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const pair = [elements[i], elements[j]].sort().join('+');
        pairFreq.set(pair, (pairFreq.get(pair) || 0) + 1);
      }
    }
  }
  
  // 找出高频元素
  const sortedElements = Array.from(elementFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(e => e[0]);
  
  return {
    elementCount: Math.round(totalElements / highHitFormulas.length),
    avgHitRate: totalHitRate / highHitFormulas.length,
    commonElements: sortedElements,
    elementPairs: pairFreq,
  };
}

// ==================== 智能评分系统 ====================
// 单元素评分缓存
const singleElementCache = new Map<string, number>();

// 评估单个元素的有效性
function evaluateSingleElement(
  element: string,
  resultType: ResultType,
  rule: 'D' | 'L',
  historyData: LotteryData[],
  periods: number,
  offset: number
): number {
  const cacheKey = `${element}_${resultType}_${rule}_${periods}_${offset}`;
  
  if (singleElementCache.has(cacheKey)) {
    return singleElementCache.get(cacheKey)!;
  }
  
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const formula = `[${rule}${resultType}]${element}${offsetStr}=${periods}`;
  const parsed = parseFormula(formula);
  if (!parsed) return 0;
  
  const result = verifyFormula(parsed, historyData, offset, periods, 0, 0);
  const score = result.hitRate;
  
  singleElementCache.set(cacheKey, score);
  return score;
}

// 元素对评分缓存
const elementPairCache = new Map<string, number>();

// 评估元素对的协同效应
function evaluateElementPair(
  elem1: string,
  elem2: string,
  resultType: ResultType,
  rule: 'D' | 'L',
  historyData: LotteryData[],
  periods: number,
  offset: number
): number {
  const pairKey = [elem1, elem2].sort().join('+');
  const cacheKey = `${pairKey}_${resultType}_${rule}_${periods}_${offset}`;
  
  if (elementPairCache.has(cacheKey)) {
    return elementPairCache.get(cacheKey)!;
  }
  
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const formula = `[${rule}${resultType}]${elem1}+${elem2}${offsetStr}=${periods}`;
  const parsed = parseFormula(formula);
  if (!parsed) return 0;
  
  const result = verifyFormula(parsed, historyData, offset, periods, 0, 0);
  const score = result.hitRate;
  
  elementPairCache.set(cacheKey, score);
  return score;
}

// ==================== 分层搜索策略 ====================
// 第一层：找出优质单元素（扩展到所有元素）
function findTopElements(
  resultType: ResultType,
  rule: 'D' | 'L',
  historyData: LotteryData[],
  targetHitRate: number,
  periods: number,
  offset: number,
  topN: number = 20
): string[] {
  // 使用所有可用元素，不仅仅是推荐元素
  const allAvailable = getAllAvailableElements(resultType);
  const elementScores: Array<{ element: string; score: number; diff: number }> = [];
  
  for (const elem of allAvailable) {
    const score = evaluateSingleElement(elem, resultType, rule, historyData, periods, offset);
    const diff = Math.abs(score - targetHitRate / 100);
    elementScores.push({ element: elem, score, diff });
  }
  
  // 按与目标命中率的接近程度排序
  elementScores.sort((a, b) => a.diff - b.diff);
  
  return elementScores.slice(0, topN).map(e => e.element);
}

// 第二层：找出优质元素对
function findTopPairs(
  topElements: string[],
  resultType: ResultType,
  rule: 'D' | 'L',
  historyData: LotteryData[],
  targetHitRate: number,
  periods: number,
  offset: number,
  topN: number = 15
): Array<[string, string]> {
  const pairScores: Array<{ elem1: string; elem2: string; score: number; diff: number }> = [];
  
  for (let i = 0; i < topElements.length && i < 15; i++) {
    for (let j = i + 1; j < topElements.length && j < 15; j++) {
      const score = evaluateElementPair(topElements[i], topElements[j], resultType, rule, historyData, periods, offset);
      const diff = Math.abs(score - targetHitRate / 100);
      pairScores.push({ elem1: topElements[i], elem2: topElements[j], score, diff });
    }
  }
  
  pairScores.sort((a, b) => a.diff - b.diff);
  
  return pairScores.slice(0, topN).map(p => [p.elem1, p.elem2] as [string, string]);
}

// 第三层：基于优质元素对构建复杂公式（支持跨类型）
function buildComplexFormulas(
  topPairs: Array<[string, string]>,
  topElements: string[],
  resultType: ResultType,
  rule: 'D' | 'L',
  historyData: LotteryData[],
  targetHitRate: number,
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number,
  maxResults: number,
  tolerance: number,
  pattern?: FormulaPattern,
  allResultTypes?: ResultType[]
): Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> {
  const results: Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> = [];
  const seenFormulas = new Set<string>();
  
  // 使用模式学习的元素数量建议
  const suggestedCount = pattern?.elementCount || 3;
  const minElements = Math.max(2, suggestedCount - 2);
  const maxElements = Math.min(8, suggestedCount + 3);
  
  for (const [elem1, elem2] of topPairs) {
    // 2元素公式 - 当前类型
    const formula2 = buildFormula([elem1, elem2], resultType, rule, periods, offset, leftExpand, rightExpand);
    if (formula2 && !seenFormulas.has(formula2)) {
      seenFormulas.add(formula2);
      const result = verifyFormulaString(formula2, historyData, offset, periods, leftExpand, rightExpand);
      if (result && Math.abs(result.hitRate * 100 - targetHitRate) <= tolerance) {
        results.push(result);
        if (results.length >= maxResults) return results;
      }
    }
    
    // 跨类型尝试：同样的元素对，尝试其他结果类型
    if (allResultTypes && allResultTypes.length > 1) {
      const crossResults = crossTypeFormulas(
        [elem1, elem2],
        allResultTypes.filter(t => t !== resultType),
        rule,
        periods,
        offset,
        leftExpand,
        rightExpand,
        historyData,
        targetHitRate,
        tolerance,
        seenFormulas
      );
      results.push(...crossResults);
      if (results.length >= maxResults) return results;
    }
    
    // 3-N元素公式
    for (let extraCount = 1; extraCount <= maxElements - 2; extraCount++) {
      const elements = [elem1, elem2];
      
      // 优先使用模式学习中的高频元素
      const candidateElements = pattern?.commonElements.length 
        ? [...pattern.commonElements, ...topElements]
        : topElements;
      
      for (const elem of candidateElements) {
        if (!elements.includes(elem) && elements.length < minElements + extraCount) {
          elements.push(elem);
        }
      }
      
      if (elements.length < 3) continue;
      
      // 当前类型
      const formula = buildFormula(elements, resultType, rule, periods, offset, leftExpand, rightExpand);
      if (formula && !seenFormulas.has(formula)) {
        seenFormulas.add(formula);
        const result = verifyFormulaString(formula, historyData, offset, periods, leftExpand, rightExpand);
        if (result && Math.abs(result.hitRate * 100 - targetHitRate) <= tolerance) {
          results.push(result);
          if (results.length >= maxResults) return results;
        }
      }
      
      // 跨类型尝试：30%概率尝试其他类型
      if (allResultTypes && allResultTypes.length > 1 && Math.random() < 0.3) {
        const otherType = allResultTypes[Math.floor(Math.random() * allResultTypes.length)];
        if (otherType !== resultType) {
          const crossFormula = buildFormula(elements, otherType, rule, periods, offset, leftExpand, rightExpand);
          if (crossFormula && !seenFormulas.has(crossFormula)) {
            seenFormulas.add(crossFormula);
            const result = verifyFormulaString(crossFormula, historyData, offset, periods, leftExpand, rightExpand);
            if (result && Math.abs(result.hitRate * 100 - targetHitRate) <= tolerance) {
              results.push(result);
              if (results.length >= maxResults) return results;
            }
          }
        }
      }
    }
  }
  
  return results;
}

// ==================== 辅助函数 ====================
// ==================== 辅助函数 ====================
// 构建公式字符串
function buildFormula(
  elements: string[],
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number
): string | null {
  if (elements.length === 0) return null;
  
  // 对元素排序，确保相同元素组合生成相同的公式
  const sortedElements = [...elements].sort();
  const expression = sortedElements.join('+');
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
  const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
  
  return `[${rule}${resultType}]${expression}${offsetStr}=${periods}${leftStr}${rightStr}`;
}

// 跨类型复用元素组：同一组元素尝试不同的结果类型
function crossTypeFormulas(
  elements: string[],
  resultTypes: ResultType[],
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number,
  historyData: LotteryData[],
  targetHitRate: number,
  tolerance: number,
  seenFormulas: Set<string>
): Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> {
  const results: Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> = [];
  
  // 对每个结果类型都尝试这组元素
  for (const resultType of resultTypes) {
    const formula = buildFormula(elements, resultType, rule, periods, offset, leftExpand, rightExpand);
    if (!formula || seenFormulas.has(formula)) continue;
    
    seenFormulas.add(formula);
    const result = verifyFormulaString(formula, historyData, offset, periods, leftExpand, rightExpand);
    
    if (result && Math.abs(result.hitRate * 100 - targetHitRate) <= tolerance) {
      results.push(result);
    }
  }
  
  return results;
}

// 验证公式字符串
function verifyFormulaString(
  formulaStr: string,
  historyData: LotteryData[],
  offset: number,
  periods: number,
  leftExpand: number,
  rightExpand: number
): { formula: string; hitRate: number; hitCount: number; totalPeriods: number } | null {
  const parsed = parseFormula(formulaStr);
  if (!parsed) return null;
  
  const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
  return {
    formula: formulaStr,
    hitRate: result.hitRate,
    hitCount: result.hitCount,
    totalPeriods: result.totalPeriods,
  };
}

// 随机生成公式（补充多样性，使用所有元素）
function generateRandomFormula(
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number,
  elementCount: number,
  pattern?: FormulaPattern
): string | null {
  let candidateElements: string[];
  
  // 70%概率使用模式学习的元素，30%概率使用所有元素
  if (pattern?.commonElements.length && Math.random() < 0.7) {
    candidateElements = pattern.commonElements;
  } else {
    // 使用所有可用元素，确保充分利用
    candidateElements = getAllAvailableElements(resultType);
  }
  
  if (candidateElements.length === 0) {
    candidateElements = getAllElements();
  }
  
  const shuffled = [...candidateElements].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(elementCount, candidateElements.length));
  
  if (selected.length === 0) return null;
  
  return buildFormula(selected, resultType, rule, periods, offset, leftExpand, rightExpand);
}

// ==================== 主搜索算法 ====================
function optimizedSearch(
  historyData: LotteryData[],
  targetHitRate: number,
  maxCount: number,
  strategy: 'fast' | 'standard' | 'deep',
  resultTypes: ResultType[],
  offset: number,
  periods: number,
  leftExpand: number,
  rightExpand: number,
  onProgress: (current: number, total: number, found: number, currentResults?: any[]) => void
): Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> {
  const allResults: Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> = [];
  const seenFormulas = new Set<string>();
  
  // 动态容差
  const tolerance = periods <= 15 ? 2 : periods <= 30 ? 3 : periods <= 50 ? 5 : 8;
  
  // 根据策略确定参数
  let topElementsCount: number, topPairsCount: number, randomIterations: number;
  switch (strategy) {
    case 'fast':
      topElementsCount = 20;  // 增加到20个
      topPairsCount = 15;     // 增加到15对
      randomIterations = 1000; // 增加随机迭代
      break;
    case 'standard':
      topElementsCount = 30;  // 增加到30个
      topPairsCount = 20;     // 增加到20对
      randomIterations = 2500; // 增加随机迭代
      break;
    case 'deep':
      topElementsCount = 40;  // 增加到40个，覆盖更多元素
      topPairsCount = 30;     // 增加到30对
      randomIterations = 5000; // 大幅增加随机迭代
      break;
    default:
      topElementsCount = 20;
      topPairsCount = 15;
      randomIterations = 1000;
  }
  
  const hierarchicalCount = Math.floor(maxCount * 0.7);
  const totalSteps = resultTypes.length * 2 * 3 + randomIterations;
  let currentStep = 0;
  
  // 阶段1：分层智能搜索
  for (const resultType of resultTypes) {
    for (const rule of ['D', 'L'] as const) {
      // 学习模式（如果有历史结果）
      const cacheKey = `${resultType}_${rule}_${periods}`;
      let pattern = patternCache.get(cacheKey);
      
      // 第一层：找优质元素
      const topElements = findTopElements(resultType, rule, historyData, targetHitRate, periods, offset, topElementsCount);
      currentStep++;
      onProgress(currentStep, totalSteps, allResults.length, allResults);
      
      // 第二层：找优质元素对
      const topPairs = findTopPairs(topElements, resultType, rule, historyData, targetHitRate, periods, offset, topPairsCount);
      currentStep++;
      onProgress(currentStep, totalSteps, allResults.length, allResults);
      
      // 第三层：构建复杂公式（传入所有结果类型以支持跨类型）
      const results = buildComplexFormulas(
        topPairs,
        topElements,
        resultType,
        rule,
        historyData,
        targetHitRate,
        periods,
        offset,
        leftExpand,
        rightExpand,
        hierarchicalCount,
        tolerance,
        pattern,
        resultTypes  // 传入所有结果类型
      );
      
      // 更新模式学习
      if (results.length > 0) {
        pattern = learnPatterns(results, targetHitRate / 100 * 0.8);
        patternCache.set(cacheKey, pattern);
      }
      
      for (const r of results) {
        if (!seenFormulas.has(r.formula)) {
          seenFormulas.add(r.formula);
          allResults.push(r);
        }
      }
      
      currentStep++;
      onProgress(currentStep, totalSteps, allResults.length, allResults);
      
      if (allResults.length >= maxCount) {
        return sortAndReturn(allResults, targetHitRate, maxCount);
      }
    }
  }
  
  // 阶段2：随机搜索（补充多样性）
  for (let i = 0; i < randomIterations && allResults.length < maxCount; i++) {
    const resultType = resultTypes[Math.floor(Math.random() * resultTypes.length)];
    const rule = Math.random() < 0.5 ? 'D' : 'L' as const;
    const elementCount = 2 + Math.floor(Math.random() * 6);
    
    // 获取该类型的模式
    const cacheKey = `${resultType}_${rule}_${periods}`;
    const pattern = patternCache.get(cacheKey);
    
    const formulaStr = generateRandomFormula(resultType, rule, periods, offset, leftExpand, rightExpand, elementCount, pattern);
    if (!formulaStr || seenFormulas.has(formulaStr)) continue;
    
    seenFormulas.add(formulaStr);
    const result = verifyFormulaString(formulaStr, historyData, offset, periods, leftExpand, rightExpand);
    
    if (result && Math.abs(result.hitRate * 100 - targetHitRate) <= tolerance) {
      allResults.push(result);
    }
    
    if (i % 100 === 0) {
      currentStep++;
      onProgress(currentStep, totalSteps, allResults.length, allResults);
    }
  }
  
  // 阶段3：全元素探索（确保所有元素都被使用）
  if (allResults.length < maxCount && strategy !== 'fast') {
    const allElements = getAllElements();
    const explorationCount = strategy === 'deep' ? 500 : 200;
    
    for (let i = 0; i < explorationCount && allResults.length < maxCount; i++) {
      const resultType = resultTypes[Math.floor(Math.random() * resultTypes.length)];
      const rule = Math.random() < 0.5 ? 'D' : 'L' as const;
      
      // 随机选择2-5个元素，确保包含一些不常用的元素
      const elementCount = 2 + Math.floor(Math.random() * 4);
      const shuffled = [...allElements].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, elementCount);
      
      const formulaStr = buildFormula(selected, resultType, rule, periods, offset, leftExpand, rightExpand);
      if (!formulaStr || seenFormulas.has(formulaStr)) continue;
      
      seenFormulas.add(formulaStr);
      const result = verifyFormulaString(formulaStr, historyData, offset, periods, leftExpand, rightExpand);
      
      if (result && Math.abs(result.hitRate * 100 - targetHitRate) <= tolerance * 1.5) {
        allResults.push(result);
      }
    }
  }
  
  // 阶段4：跨类型复用优质元素组（同一组元素尝试不同结果类型）
  if (allResults.length < maxCount && resultTypes.length > 1) {
    // 从已找到的优质公式中提取元素组
    const topFormulas = allResults
      .sort((a, b) => Math.abs(b.hitRate * 100 - targetHitRate) - Math.abs(a.hitRate * 100 - targetHitRate))
      .slice(0, 20);
    
    for (const topFormula of topFormulas) {
      if (allResults.length >= maxCount) break;
      
      const parsed = parseFormula(topFormula.formula);
      if (!parsed) continue;
      
      // 提取元素
      const elements = parsed.expression.split(/[+\-]/).filter(e => e.trim());
      if (elements.length < 2) continue;
      
      // 尝试不同的规则
      for (const rule of ['D', 'L'] as const) {
        if (allResults.length >= maxCount) break;
        
        // 跨类型复用这组元素
        const crossResults = crossTypeFormulas(
          elements,
          resultTypes,
          rule,
          periods,
          offset,
          leftExpand,
          rightExpand,
          historyData,
          targetHitRate,
          tolerance,
          seenFormulas
        );
        
        allResults.push(...crossResults);
      }
    }
  }
  
  return sortAndReturn(allResults, targetHitRate, maxCount);
}

// 排序并返回结果
function sortAndReturn(
  results: Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }>,
  targetHitRate: number,
  maxCount: number
): Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> {
  // 按与目标命中率的接近程度排序
  results.sort((a, b) => {
    const diffA = Math.abs(a.hitRate * 100 - targetHitRate);
    const diffB = Math.abs(b.hitRate * 100 - targetHitRate);
    return diffA - diffB;
  });
  
  return results.slice(0, maxCount);
}

// ==================== Worker 消息处理 ====================
self.onmessage = (event) => {
  const { type, historyData, targetHitRate, maxCount, strategy, resultTypes, offset, periods, leftExpand, rightExpand } = event.data;
  
  if (type !== 'search') return;
  
  try {
    const results = optimizedSearch(
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
