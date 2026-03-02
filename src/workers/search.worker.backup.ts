// 智能搜索 Worker - 将计算移到后台线程
import type { LotteryData, ResultType } from '../types';
import { chineseToNumber, normalizeSimplifiedExpression, normalizeElementName, getAllElements, getZodiacMap, WAVE_COLORS, FIVE_ELEMENTS_BY_YEAR, BIG_SMALL_ODD_EVEN, ZODIAC_NAMES, BASE_ZODIAC_NUMBERS } from '../utils/elements';
import { ParsedFormula, parseFormula, RESULT_TYPES } from '../utils/formulaParser';
import { evaluateCondition, processConditionElements, evaluateExpression, applyCycle, getExpandedResults, getNumberAttribute, verifyFormula, calculateElementValue, getRecommendedElements } from '../utils/calculator';





// ==================== 优化的元素分组系统 ====================
// 核心元素：高频、稳定、易命中
const CORE_ELEMENTS = {
  期数组: ['期数尾', '期数合尾'],  // 只保留最常用的
  总分组: ['总分尾', '总分合尾'],
  尾数组: ['平1尾', '平2尾', '平6尾', '特尾'],  // 重点位置
  头数组: ['平1头', '平6头', '特头'],
  合数组: ['平1合', '平6合', '特合', '期数合尾', '总分合尾'],
};

// 扩展元素：用于增加多样性
const EXTENDED_ELEMENTS = {
  波数组: ['平1波', '平2波', '平3波', '平4波', '平5波', '平6波', '特波'],
  行数组: ['平1行', '平2行', '平3行', '平4行', '平5行', '平6行', '特行'],
  段数组: ['平1段', '平2段', '平3段', '平4段', '平5段', '平6段', '特段'],
  肖位数组: ['平1肖位', '平2肖位', '平3肖位', '平4肖位', '平5肖位', '平6肖位', '特肖位'],
};

// 结果类型与元素的优先级映射
const RESULT_TYPE_PRIORITY_MAP: Record<ResultType, { core: string[], extended: string[] }> = {
  '尾数类': {
    core: [...CORE_ELEMENTS.尾数组, ...CORE_ELEMENTS.期数组, ...CORE_ELEMENTS.合数组],
    extended: [...CORE_ELEMENTS.总分组]
  },
  '头数类': {
    core: [...CORE_ELEMENTS.头数组],
    extended: [...CORE_ELEMENTS.期数组]
  },
  '合数类': {
    core: [...CORE_ELEMENTS.合数组, ...CORE_ELEMENTS.期数组],
    extended: [...CORE_ELEMENTS.总分组, ...CORE_ELEMENTS.尾数组]
  },
  '波色类': {
    core: [...EXTENDED_ELEMENTS.波数组],
    extended: [...CORE_ELEMENTS.期数组]
  },
  '五行类': {
    core: [...EXTENDED_ELEMENTS.行数组],
    extended: [...CORE_ELEMENTS.期数组]
  },
  '肖位类': {
    core: [...EXTENDED_ELEMENTS.肖位数组],
    extended: [...CORE_ELEMENTS.期数组]
  },
  '单特类': {
    core: [...CORE_ELEMENTS.尾数组, ...CORE_ELEMENTS.头数组],
    extended: [...CORE_ELEMENTS.期数组, ...CORE_ELEMENTS.合数组]
  },
  '大小单双类': {
    core: [...CORE_ELEMENTS.尾数组, ...CORE_ELEMENTS.合数组],
    extended: [...EXTENDED_ELEMENTS.段数组]
  },
};

// 获取结果类型推荐的元素（分优先级）
function getRecommendedElements(resultType: ResultType, includeExtended: boolean = true): string[] {
  const priority = RESULT_TYPE_PRIORITY_MAP[resultType];
  if (!priority) return [];
  
  if (includeExtended) {
    return [...priority.core, ...priority.extended];
  }
  return priority.core;
}

// ==================== 智能元素组合策略 ====================
// 辅助函数：智能连接元素（优化运算符选择）
function joinElementsWithSmartOperators(elements: string[]): string {
  if (elements.length === 0) return '';
  if (elements.length === 1) return elements[0];
  
  let result = elements[0];
  for (let i = 1; i < elements.length; i++) {
    // 90% 概率加法（加法更稳定），10% 概率减法（增加多样性）
    const operator = Math.random() > 0.1 ? '+' : '-';
    result += operator + elements[i];
  }
  return result;
}

// 元素协同评分：某些元素组合效果更好
const ELEMENT_SYNERGY: Record<string, string[]> = {
  '期数尾': ['总分尾', '特尾', '平1尾'],
  '期数合尾': ['总分合尾', '特合'],
  '特尾': ['平1尾', '平6尾', '期数尾'],
  '特合': ['平1合', '平6合', '期数合尾'],
  '总分尾': ['期数尾', '特尾'],
  '总分合尾': ['期数合尾', '特合'],
};

// 检查元素组合的协同性
function hasGoodSynergy(elements: string[]): boolean {
  for (let i = 0; i < elements.length - 1; i++) {
    const elem = elements[i];
    const synergies = ELEMENT_SYNERGY[elem];
    if (synergies) {
      for (let j = i + 1; j < elements.length; j++) {
        if (synergies.includes(elements[j])) {
          return true;  // 找到协同元素
        }
      }
    }
  }
  return false;
}

// ==================== 优化的公式生成策略 ====================
// 从种子元素生成公式（更智能的元素选择）
function generateFromSeed(
  seedElement: string,
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number
): string | null {
  // 根据期数动态调整元素数量
  const elementCount = periods <= 15 ? 2 + Math.floor(Math.random() * 3) :  // 15期以下：2-4个元素
                       periods <= 30 ? 3 + Math.floor(Math.random() * 3) :  // 30期以下：3-5个元素
                       periods <= 50 ? 4 + Math.floor(Math.random() * 4) :  // 50期以下：4-7个元素
                       5 + Math.floor(Math.random() * 5);                    // 50期以上：5-9个元素
  
  const elements: string[] = [seedElement];
  const used = new Set<string>([seedElement]);
  
  // 优先选择核心元素
  const coreElements = getRecommendedElements(resultType, false);
  const extendedElements = getRecommendedElements(resultType, true);
  
  // 70% 从核心元素选，30% 从扩展元素选
  for (let i = 0; i < elementCount - 1; i++) {
    let elem: string;
    let attempts = 0;
    do {
      if (Math.random() < 0.7 && coreElements.length > 0) {
        elem = coreElements[Math.floor(Math.random() * coreElements.length)];
      } else {
        elem = extendedElements[Math.floor(Math.random() * extendedElements.length)];
      }
      attempts++;
    } while (used.has(elem) && attempts < 20);
    
    if (!used.has(elem)) {
      used.add(elem);
      elements.push(elem);
    }
  }
  
  // 检查协同性，如果没有协同元素，尝试添加一个
  if (elements.length >= 2 && !hasGoodSynergy(elements)) {
    const firstElem = elements[0];
    const synergies = ELEMENT_SYNERGY[firstElem];
    if (synergies && synergies.length > 0) {
      const synergyElem = synergies[Math.floor(Math.random() * synergies.length)];
      if (!used.has(synergyElem)) {
        elements.push(synergyElem);
      }
    }
  }
  
  const expression = joinElementsWithSmartOperators(elements);
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
  const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
  
  return `[${rule}${resultType}]${expression}${offsetStr}=${periods}${leftStr}${rightStr}`;
}

// 从模板生成公式 - 优化元素选择策略
function generateFromTemplate(
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number,
  searchStrategy: 'fast' | 'standard' | 'deep' = 'standard'
): string | null {
  // 根据策略和期数确定元素数量范围
  let minElements: number, maxElements: number;
  
  if (periods <= 15) {
    // 短期验证：少元素
    minElements = 2;
    maxElements = searchStrategy === 'fast' ? 4 : searchStrategy === 'standard' ? 5 : 6;
  } else if (periods <= 30) {
    // 中期验证：中等元素
    minElements = 3;
    maxElements = searchStrategy === 'fast' ? 5 : searchStrategy === 'standard' ? 7 : 8;
  } else if (periods <= 50) {
    // 长期验证：较多元素
    minElements = 4;
    maxElements = searchStrategy === 'fast' ? 7 : searchStrategy === 'standard' ? 9 : 11;
  } else {
    // 超长期验证：更多元素
    minElements = 5;
    maxElements = searchStrategy === 'fast' ? 9 : searchStrategy === 'standard' ? 12 : 15;
  }
  
  // 获取核心和扩展元素池
  const coreElements = getRecommendedElements(resultType, false);
  const extendedElements = getRecommendedElements(resultType, true);
  
  // 随机选择元素数量
  const elementCount = minElements + Math.floor(Math.random() * (maxElements - minElements + 1));
  
  // 生成不重复的随机组合（优先核心元素）
  const elements: string[] = [];
  const used = new Set<string>();
  
  // 至少选择 60% 的核心元素
  const coreCount = Math.ceil(elementCount * 0.6);
  for (let i = 0; i < coreCount && i < coreElements.length; i++) {
    let elem: string;
    let attempts = 0;
    do {
      elem = coreElements[Math.floor(Math.random() * coreElements.length)];
      attempts++;
    } while (used.has(elem) && attempts < 20);
    if (!used.has(elem)) {
      used.add(elem);
      elements.push(elem);
    }
  }
  
  // 剩余从扩展元素中选择
  for (let i = elements.length; i < elementCount; i++) {
    let elem: string;
    let attempts = 0;
    do {
      elem = extendedElements[Math.floor(Math.random() * extendedElements.length)];
      attempts++;
    } while (used.has(elem) && attempts < 20);
    if (!used.has(elem)) {
      used.add(elem);
      elements.push(elem);
    }
  }
  
  if (elements.length < minElements) return null;
  
  const expression = joinElementsWithSmartOperators(elements);
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
  const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
  
  return `[${rule}${resultType}]${expression}${offsetStr}=${periods}${leftStr}${rightStr}`;
}

// 获取与结果类型相关的元素（优化后只返回推荐元素）
function getRelatedElements(resultType: ResultType): string[] {
  return getRecommendedElements(resultType, true);
}

// 生成指定大小的所有组合
function* generateCombinationsOfSize(
  pool: string[], 
  count: number
): Generator<string[]> {
  const indices: number[] = [];
  
  function* next(i: number): Generator<string[]> {
    if (indices.length === count) {
      yield indices.map(idx => pool[idx]);
      return;
    }
    if (i >= pool.length) return;
    
    indices.push(i);
    yield* next(i + 1);
    indices.pop();
    
    yield* next(i + 1);
  }
  
  yield* next(0);
}

// 全组合搜索（遍历所有可能，带缓存和剪枝）
function exhaustiveSearch(
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number,
  historyData: LotteryData[],
  targetHitRate: number,
  maxResults: number,
  tolerance: number,
  strategy: 'fast' | 'standard' | 'deep',
  onProgress: (current: number, total: number, found: number, currentResults?: { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[]) => void
): { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[] {
  const results: { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[] = [];
  
  // 根据策略确定元素数量范围
  let minElements: number;
  let maxElements: number;
  switch (strategy) {
    case 'fast':
      minElements = 1;
      maxElements = 5;
      break;
    case 'standard':
      minElements = 5;
      maxElements = 10;
      break;
    case 'deep':
      minElements = 10;
      maxElements = 15;
      break;
    default:
      minElements = 1;
      maxElements = 5;
  }
  
  // 获取相关元素池（使用所有元素，支持跨类型搜索）
  const elementPool = getRelatedElements(resultType);
  
  // 缓存已验证的元素组合（用于剪枝）
  const elementCache = new Map<string, number>();
  
  let processed = 0;
  let totalCombos = 0;
  
  // 计算总组合数
  for (let c = minElements; c <= maxElements; c++) {
    let combos = 1;
    for (let i = 0; i < c; i++) {
      combos *= (elementPool.length - i);
      combos /= (i + 1);
    }
    totalCombos += combos;
  }
  
  let found = 0;
  
  // 渐进式搜索：从1个元素到maxElements
  for (let elementCount = minElements; elementCount <= maxElements; elementCount++) {
    
    // 遍历指定数量的所有组合
    for (const elements of generateCombinationsOfSize(elementPool, elementCount)) {
      processed++;
      
      if (processed % 5000 === 0) {
        onProgress(processed, totalCombos, found, results);
      }
      
      // 剪枝：检查前面部分元素的命中率
      if (elements.length > 1) {
        // 检查前面一半元素的命中率
        const halfCount = Math.ceil(elements.length / 2);
        const prefixElements = elements.slice(0, halfCount);
        const prefixKey = prefixElements.sort().join('+');
        
        if (elementCache.has(prefixKey)) {
          const cachedRate = elementCache.get(prefixKey)!;
          // 如果前面一半元素命中率很低，后面加元素也救不回来
          const maxPossibleRate = cachedRate + (100 - cachedRate) * 0.3;
          if (maxPossibleRate < targetHitRate - tolerance) {
            continue; // 跳过这个组合
          }
        }
      }
      
      const expression = elements.join('+');
      const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
      const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
      const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
      
      const formula = `[${rule}${resultType}]${expression}${offsetStr}=${periods}${leftStr}${rightStr}`;
      
      const parsed = parseFormula(formula);
      if (!parsed) continue;
      
      const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
      const hitRate = result.hitRate * 100;
      
      // 缓存这个元素组合的命中率（用于剪枝）
      const cacheKey = [...elements].sort().join('+');
      elementCache.set(cacheKey, hitRate);
      
      if (Math.abs(hitRate - targetHitRate) <= tolerance) {
        results.push({
          formula,
          hitRate: result.hitRate,
          hitCount: result.hitCount,
          totalPeriods: result.totalPeriods,
        });
        found++;
        
        if (found >= maxResults) {
        onProgress(processed, totalCombos, found, results);
          return results;
        }
      }
    }
  }
  
  onProgress(processed, totalCombos, found, results);
  return results;
}

// ==================== 优化的评估函数 ====================
// 评估公式的综合得分（不只看命中率）
function evaluateFitness(
  result: { hitRate: number; hitCount: number; totalPeriods: number; hits: boolean[] },
  targetHitRate: number
): number {
  // 1. 命中率得分 (0-40分) - 降低权重
  const hitRateDiff = Math.abs(result.hitRate - targetHitRate);
  const hitRateScore = Math.max(0, 40 - hitRateDiff * 80);
  
  // 2. 近期表现得分 (0-30分) - 最近10期，越近权重越高
  let recentScore = 0;
  const recentCount = Math.min(10, result.hits.length);
  const recentHits = result.hits.slice(-recentCount);
  recentHits.forEach((hit, idx) => {
    if (hit) {
      // 权重：1,2,3,4,5,6,7,8,9,10 -> 总分55，归一化到30
      recentScore += (idx + 1) * (30 / 55);
    }
  });
  
  // 3. 稳定性得分 (0-20分) - 连续命中和均匀分布
  let stabilityScore = 0;
  
  // 3.1 最大连续命中（0-10分）
  let maxConsecutive = 0;
  let currentConsecutive = 0;
  for (const hit of result.hits) {
    if (hit) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }
  stabilityScore += Math.min(10, maxConsecutive * 2);
  
  // 3.2 分布均匀性（0-10分）- 避免命中过于集中
  if (result.hitCount > 0) {
    const segments = 5;  // 分成5段
    const segmentSize = Math.ceil(result.hits.length / segments);
    const segmentHits: number[] = [];
    
    for (let i = 0; i < segments; i++) {
      const start = i * segmentSize;
      const end = Math.min(start + segmentSize, result.hits.length);
      const hits = result.hits.slice(start, end).filter(h => h).length;
      segmentHits.push(hits);
    }
    
    // 计算方差，方差越小越均匀
    const mean = segmentHits.reduce((a, b) => a + b, 0) / segmentHits.length;
    const variance = segmentHits.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / segmentHits.length;
    const uniformityScore = Math.max(0, 10 - variance);
    stabilityScore += uniformityScore;
  }
  
  // 4. 实用性得分 (0-10分) - 避免极端情况
  let practicalScore = 10;
  
  // 惩罚全中或全不中
  if (result.hitRate === 1 || result.hitRate === 0) {
    practicalScore -= 5;
  }
  
  // 惩罚命中次数过少（不实用）
  if (result.hitCount < 2) {
    practicalScore -= 3;
  }
  
  return hitRateScore + recentScore + stabilityScore + practicalScore;
}

// ==================== 优化的变异策略 ====================
// 变异公式 - 更智能的修改策略
function mutateFormula(
  formulaStr: string,
  allElements: string[],
  mutationRate: number = 0.4,  // 降低变异率，保持稳定性
  periods: number = 50,
  searchStrategy: 'fast' | 'standard' | 'deep' = 'standard'
): string | null {
  const parsed = parseFormula(formulaStr);
  if (!parsed) return null;
  
  const elements = parsed.expression.split(/[+\-]/).filter(e => e.trim());
  if (elements.length === 0) return null;
  
  // 根据期数和策略确定元素数量范围
  const minElements = 2;
  const maxElements = periods <= 15 ? 6 : periods <= 30 ? 8 : periods <= 50 ? 11 : 15;
  
  const newElements: string[] = [];
  const recommended = getRecommendedElements(parsed.resultType, true);
  const core = getRecommendedElements(parsed.resultType, false);
  
  // 变异策略：保留一些原有元素，替换一些
  for (const elem of elements) {
    if (Math.random() < mutationRate) {
      // 变异：80% 从核心元素选，20% 从推荐元素选
      if (Math.random() < 0.8 && core.length > 0) {
        newElements.push(core[Math.floor(Math.random() * core.length)]);
      } else if (recommended.length > 0) {
        newElements.push(recommended[Math.floor(Math.random() * recommended.length)]);
      }
    } else {
      // 保留原元素
      newElements.push(elem);
    }
  }
  
  // 去重
  const uniqueElements = Array.from(new Set(newElements));
  
  // 动态调整元素数量
  const addProb = uniqueElements.length < maxElements * 0.7 ? 0.4 : 0.2;
  const removeProb = uniqueElements.length > maxElements * 0.5 ? 0.3 : 0.1;
  
  // 添加新元素（优先添加协同元素）
  if (Math.random() < addProb && uniqueElements.length < maxElements) {
    let newElem: string | null = null;
    
    // 50% 概率尝试添加协同元素
    if (Math.random() < 0.5 && uniqueElements.length > 0) {
      const firstElem = uniqueElements[0];
      const synergies = ELEMENT_SYNERGY[firstElem];
      if (synergies && synergies.length > 0) {
        const candidate = synergies[Math.floor(Math.random() * synergies.length)];
        if (!uniqueElements.includes(candidate)) {
          newElem = candidate;
        }
      }
    }
    
    // 如果没有找到协同元素，从核心元素中选
    if (!newElem) {
      newElem = core.length > 0
        ? core[Math.floor(Math.random() * core.length)]
        : recommended[Math.floor(Math.random() * recommended.length)];
    }
    
    if (newElem && !uniqueElements.includes(newElem)) {
      const pos = Math.floor(Math.random() * (uniqueElements.length + 1));
      uniqueElements.splice(pos, 0, newElem);
    }
  }
  
  // 删除元素
  if (Math.random() < removeProb && uniqueElements.length > minElements) {
    const pos = Math.floor(Math.random() * uniqueElements.length);
    uniqueElements.splice(pos, 1);
  }
  
  // 小概率完全重写（降低到5%）
  if (Math.random() < 0.05) {
    const seedElem = core.length > 0 
      ? core[Math.floor(Math.random() * core.length)]
      : recommended[0];
    return generateFromSeed(
      seedElem,
      parsed.resultType,
      Math.random() > 0.5 ? 'D' : 'L',
      periods,
      parsed.offset,
      parsed.leftExpand,
      parsed.rightExpand
    );
  }
  
  if (uniqueElements.length < minElements) return null;
  
  const expression = joinElementsWithSmartOperators(uniqueElements);
  const offsetStr = parsed.offset >= 0 ? `+${parsed.offset}` : `${parsed.offset}`;
  const leftStr = parsed.leftExpand > 0 ? `左${parsed.leftExpand}` : '';
  const rightStr = parsed.rightExpand > 0 ? `右${parsed.rightExpand}` : '';
  
  return `[${parsed.rule}${parsed.resultType}]${expression}${offsetStr}=${parsed.periods}${leftStr}${rightStr}`;
}

// ==================== 优化的进化搜索算法 ====================
function evolutionarySearch(
  historyData: LotteryData[],
  targetHitRate: number,
  maxCount: number,
  strategy: 'fast' | 'standard' | 'deep',
  resultTypes: ResultType[],
  offset: number,
  periods: number,
  leftExpand: number,
  rightExpand: number,
  onProgress: (current: number, total: number, found: number, currentResults?: { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[]) => void
): { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[] {
  
  const allElements = getAllElements();
  const results: { formula: string; hitRate: number; hitCount: number; totalPeriods: number; fitness?: number }[] = [];
  
  // 容差根据期数和目标命中率动态调整
  let tolerance: number;
  if (periods <= 15) {
    tolerance = 5;  // 短期：容差大一些
  } else if (periods <= 30) {
    tolerance = 3;
  } else if (periods <= 50) {
    tolerance = 2;
  } else {
    tolerance = 1.5;
  }
  
  // 如果目标命中率极端（<20% 或 >80%），放宽容差
  if (targetHitRate < 20 || targetHitRate > 80) {
    tolerance *= 1.5;
  }
  
  // 深度策略使用全组合搜索
  if (strategy === 'deep') {
    const seenFormulas = new Set<string>();
    
    for (const resultType of resultTypes) {
      for (const rule of ['D', 'L'] as const) {
        const exhaustiveResults = exhaustiveSearch(
          resultType,
          rule,
          periods,
          offset,
          leftExpand,
          rightExpand,
          historyData,
          targetHitRate,
          maxCount,
          tolerance,
          strategy,
          onProgress
        );
        
        for (const r of exhaustiveResults) {
          if (!seenFormulas.has(r.formula)) {
            seenFormulas.add(r.formula);
            results.push(r);
            if (results.length >= maxCount) break;
          }
        }
        
        if (results.length >= maxCount) break;
      }
      if (results.length >= maxCount) break;
    }
    
    return results;
  }
  
  const seenFormulas = new Set<string>();
  
  // 根据策略确定参数
  let populationSize: number, generations: number, mutationRate: number;
  switch (strategy) {
    case 'fast':
      populationSize = 100;
      generations = 10;
      mutationRate = 0.4;
      break;
    case 'standard':
      populationSize = 200;
      generations = 20;
      mutationRate = 0.35;
      break;
    default:
      populationSize = 100;
      generations = 10;
      mutationRate = 0.4;
  }
  
  const totalIterations = populationSize * generations;
  let currentIteration = 0;
  
  // ==================== 第一阶段：智能初始化 ====================
  // 使用核心元素作为种子
  for (const resultType of resultTypes) {
    const coreElements = getRecommendedElements(resultType, false);
    const seedCount = Math.min(5, coreElements.length);  // 每个类型取5个核心元素作为种子
    
    for (let i = 0; i < seedCount; i++) {
      const seedElem = coreElements[i];
      for (const rule of ['D', 'L'] as const) {
        const formula = generateFromSeed(seedElem, resultType, rule, periods, offset, leftExpand, rightExpand);
        if (formula && !seenFormulas.has(formula)) {
          seenFormulas.add(formula);
          const parsed = parseFormula(formula);
          if (parsed) {
            const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
            const hitRate = result.hitRate * 100;
            
            // 初始阶段放宽容差
            if (Math.abs(hitRate - targetHitRate) <= tolerance * 2) {
              const fitness = evaluateFitness(
                { ...result, hits: result.hits },
                targetHitRate / 100
              );
              results.push({
                formula,
                hitRate: result.hitRate,
                hitCount: result.hitCount,
                totalPeriods: result.totalPeriods,
                fitness
              });
            }
          }
        }
        currentIteration++;
      }
    }
  }
  
  // ==================== 第二阶段：模板生成补充 ====================
  const templateCount = Math.floor(populationSize * 0.3);  // 30% 用模板生成
  for (let i = 0; i < templateCount; i++) {
    const resultType = resultTypes[Math.floor(Math.random() * resultTypes.length)];
    const rule = Math.random() < 0.5 ? 'D' : 'L' as const;
    const formula = generateFromTemplate(resultType, rule, periods, offset, leftExpand, rightExpand, strategy);
    
    if (formula && !seenFormulas.has(formula)) {
      seenFormulas.add(formula);
      const parsed = parseFormula(formula);
      if (parsed) {
        const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
        const hitRate = result.hitRate * 100;
        if (Math.abs(hitRate - targetHitRate) <= tolerance * 1.5) {
          const fitness = evaluateFitness(
            { ...result, hits: result.hits },
            targetHitRate / 100
          );
          results.push({
            formula,
            hitRate: result.hitRate,
            hitCount: result.hitCount,
            totalPeriods: result.totalPeriods,
            fitness
          });
        }
      }
    }
    currentIteration++;
  }
  
  // 报告初始化进度
  onProgress(currentIteration, totalIterations, results.length, results);
  
  // ==================== 第三阶段：进化迭代 ====================
  for (let gen = 0; gen < generations; gen++) {
    // 选择优秀个体（按fitness排序，取前30%）
    const sortedResults = [...results].sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
    const eliteCount = Math.max(10, Math.floor(sortedResults.length * 0.3));
    const elites = sortedResults.slice(0, eliteCount);
    
    if (elites.length === 0) break;
    
    const newPopulation: typeof results = [];
    
    // 从精英个体变异生成新个体
    const mutationCount = Math.floor(populationSize * 0.5);
    for (let i = 0; i < mutationCount; i++) {
      const parent = elites[Math.floor(Math.random() * elites.length)];
      const mutated = mutateFormula(parent.formula, allElements, mutationRate, periods, strategy);
      
      if (mutated && !seenFormulas.has(mutated)) {
        seenFormulas.add(mutated);
        const parsed = parseFormula(mutated);
        if (parsed) {
          const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
          const hitRate = result.hitRate * 100;
          
          if (Math.abs(hitRate - targetHitRate) <= tolerance) {
            const fitness = evaluateFitness(
              { ...result, hits: result.hits },
              targetHitRate / 100
            );
            newPopulation.push({
              formula: mutated,
              hitRate: result.hitRate,
              hitCount: result.hitCount,
              totalPeriods: result.totalPeriods,
              fitness
            });
          }
        }
      }
      currentIteration++;
      
      if (currentIteration % 50 === 0) {
        onProgress(currentIteration, totalIterations, results.length + newPopulation.length, [...results, ...newPopulation]);
      }
    }
    
    // 随机生成补充（保持多样性）
    const randomCount = Math.floor(populationSize * 0.2);
    for (let i = 0; i < randomCount; i++) {
      const resultType = resultTypes[Math.floor(Math.random() * resultTypes.length)];
      const rule = Math.random() < 0.5 ? 'D' : 'L' as const;
      const formula = generateFromTemplate(resultType, rule, periods, offset, leftExpand, rightExpand, strategy);
      
      if (formula && !seenFormulas.has(formula)) {
        seenFormulas.add(formula);
        const parsed = parseFormula(formula);
        if (parsed) {
          const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
          const hitRate = result.hitRate * 100;
          if (Math.abs(hitRate - targetHitRate) <= tolerance) {
            const fitness = evaluateFitness(
              { ...result, hits: result.hits },
              targetHitRate / 100
            );
            newPopulation.push({
              formula,
              hitRate: result.hitRate,
              hitCount: result.hitCount,
              totalPeriods: result.totalPeriods,
              fitness
            });
          }
        }
      }
      currentIteration++;
    }
    
    // 合并新种群
    results.push(...newPopulation);
    
    // 定期报告进度
    onProgress(currentIteration, totalIterations, results.length, results);
    
    // 如果找到足够多的结果，提前结束
    if (results.length >= maxCount * 1.5) break;
  }
  
  // 最终排序：优先按fitness，其次按命中率
  results.sort((a, b) => {
    const fitnessDiff = (b.fitness || 0) - (a.fitness || 0);
    if (Math.abs(fitnessDiff) > 1) return fitnessDiff;
    return Math.abs(a.hitRate - targetHitRate / 100) - Math.abs(b.hitRate - targetHitRate / 100);
  });
  
  return results.slice(0, maxCount);
}

// Worker 消息处理
self.onmessage = (event) => {
  const { type, historyData, targetHitRate, maxCount, strategy, resultTypes, offset, periods, leftExpand, rightExpand } = event.data;
  
  if (type !== 'search') return;
  
  try {
    // 使用优化后的进化搜索算法
    const results = evolutionarySearch(
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
    
    // 智能排序：综合考虑命中率、fitness和实用性
    results.sort((a, b) => {
      // 优先按fitness排序
      const fitnessDiff = (b.fitness || 0) - (a.fitness || 0);
      if (Math.abs(fitnessDiff) > 2) return fitnessDiff;
      
      // fitness相近时，按命中率接近度排序
      const aHitDiff = Math.abs(a.hitRate * 100 - targetHitRate);
      const bHitDiff = Math.abs(b.hitRate * 100 - targetHitRate);
      if (Math.abs(aHitDiff - bHitDiff) > 0.5) {
        return aHitDiff - bHitDiff;
      }
      
      // 最后按命中次数排序（更实用）
      return b.hitCount - a.hitCount;
    });
    
    self.postMessage({
      type: 'complete',
      results: results.slice(0, maxCount)
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: String(error)
    });
  }
};

export {};
