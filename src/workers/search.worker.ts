// 智能搜索 Worker - 将计算移到后台线程
import type { LotteryData, ResultType } from '../types';
import { chineseToNumber, normalizeSimplifiedExpression, normalizeElementName, getAllElements, getZodiacMap, WAVE_COLORS, FIVE_ELEMENTS_BY_YEAR, BIG_SMALL_ODD_EVEN, ZODIAC_NAMES, BASE_ZODIAC_NUMBERS } from '../utils/elements';
import { ParsedFormula, parseFormula, RESULT_TYPES } from '../utils/formulaParser';
import { evaluateCondition, processConditionElements, evaluateExpression, applyCycle, getExpandedResults, getNumberAttribute, verifyFormula, calculateElementValue, getRecommendedElements } from '../utils/calculator';





// 元素分组定义 - 根据属性类型分组
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
};

// 结果类型与元素组的映射关系
const RESULT_TYPE_ELEMENT_MAP: Record<ResultType, string[]> = {
  '尾数类': ['尾数组', '期数组', '合数组'],
  '头数类': ['头数组'],
  '合数类': ['合数组', '期数组', '总分组'],
  '波色类': ['波数组'],
  '五行类': ['行数组'],
  '肖位类': ['肖位数组'],
  '单特类': ['号数组', '期数组'],
  '大小单双类': ['尾数组', '合数组', '段数组'],
};

// 获取结果类型推荐的元素
function getRecommendedElements(resultType: ResultType): string[] {
  const groups = RESULT_TYPE_ELEMENT_MAP[resultType] || [];
  const elements: string[] = [];
  for (const group of groups) {
    elements.push(...(ELEMENT_GROUPS[group as keyof typeof ELEMENT_GROUPS] || []));
  }
  return elements;
}

// 辅助函数：随机使用加减号连接元素
function joinElementsWithRandomOperators(elements: string[]): string {
  if (elements.length === 0) return '';
  if (elements.length === 1) return elements[0];
  
  let result = elements[0];
  for (let i = 1; i < elements.length; i++) {
    const operator = Math.random() > 0.2 ? '+' : '-'; // 80% 概率加法，20% 概率减法
    result += operator + elements[i];
  }
  return result;
}

// 从种子元素生成公式（多种子初始化）
function generateFromSeed(
  seedElement: string,
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number
): string | null {
  // 以种子元素为核心，添加更多相关元素
  const allElements = getAllElements();
  const relatedElements = getRelatedElements(resultType);
  
  // 从相关元素中选择3-8个元素
  const elementCount = 3 + Math.floor(Math.random() * 6);
  const elements: string[] = [seedElement];
  const used = new Set<string>([seedElement]);
  
  // 优先从相关元素中选择
  for (let i = 0; i < elementCount - 1; i++) {
    let elem: string;
    let attempts = 0;
    do {
      if (relatedElements.length > 0 && Math.random() > 0.3) {
        elem = relatedElements[Math.floor(Math.random() * relatedElements.length)];
      } else {
        elem = allElements[Math.floor(Math.random() * allElements.length)];
      }
      attempts++;
    } while (used.has(elem) && attempts < 20);
    used.add(elem);
    elements.push(elem);
  }
  const expression = joinElementsWithRandomOperators(elements);
  // FIX: Ensure proper offset handling by using '+X' or '-X' format for consistency with formulaParser
  const offsetPart = offset !== 0 ? `补偿${offset}` : '';
  const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
  const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
  
  return `[${rule}${resultType}]${expression}${offsetPart}=${periods}${leftStr}${rightStr}`;
}

// 从模板生成公式 - 根据策略确定元素数量
function generateFromTemplate(
  resultType: ResultType,
  rule: 'D' | 'L',
  periods: number,
  offset: number,
  leftExpand: number,
  rightExpand: number,
  searchStrategy: 'fast' | 'standard' | 'deep' = 'standard'
): string | null {
  // 根据策略确定元素数量范围
  let minElements: number, maxElements: number;
  switch (searchStrategy) {
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
  
  // 获取相关元素池
  const elementPool = getRelatedElements(resultType);
  const allElements = getAllElements();
  const pool = elementPool.length > 0 ? elementPool : allElements.slice(0, 30);
  
  // 随机选择一个元素数量
  const elementCount = minElements + Math.floor(Math.random() * (maxElements - minElements + 1));
  
  // 生成不重复的随机组合
  const elements: string[] = [];
  const used = new Set<string>();
  for (let i = 0; i < elementCount; i++) {
    let elem: string;
    let attempts = 0;
    do {
      elem = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    } while (used.has(elem) && attempts < 20);
    used.add(elem);
    elements.push(elem);
  }
  
  if (elements.length < 3) return null;
  
  const expression = joinElementsWithRandomOperators(elements);
  const offsetPart = offset !== 0 ? `补偿${offset}` : '';
  const leftStr = leftExpand > 0 ? `左${leftExpand}` : '';
  const rightStr = rightExpand > 0 ? `右${rightExpand}` : '';
  
  return `[${rule}${resultType}]${expression}${offsetPart}=${periods}${leftStr}${rightStr}`;
}

// 获取与结果类型相关的元素（现在返回所有元素，支持跨类型搜索）
function getRelatedElements(_resultType: ResultType): string[] {
  return getAllElements();
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

// 评估公式的适应度（Fitness）
// 综合考虑：命中率、近期表现、稳定性（连中情况）
function evaluateFitness(
  result: { hitRate: number; hitCount: number; totalPeriods: number; hits: boolean[] },
  targetHitRate: number
): number {
  // 1. 命中率得分 (0-50)
  const hitRateDiff = Math.abs(result.hitRate - targetHitRate);
  const hitRateScore = Math.max(0, 50 - hitRateDiff * 100);
  
  // 2. 近期表现得分 (0-30) - 最近5期权重更高
  let recentScore = 0;
  const recentHits = result.hits.slice(-5);
  recentHits.forEach((hit, idx) => {
    if (hit) recentScore += (idx + 1) * 2; // 1,2,3,4,5 -> 总分15，乘以2为30
  });
  
  // 3. 稳定性得分 (0-20) - 连续命中奖励
  let stabilityScore = 0;
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
  stabilityScore = Math.min(20, maxConsecutive * 4);
  
  return hitRateScore + recentScore + stabilityScore;
}

// 变异公式 - 在现有公式基础上修改（更激进的策略）
function mutateFormula(
  formulaStr: string,
  allElements: string[],
  mutationRate: number = 0.5,
  periods: number = 50,
  searchStrategy: 'fast' | 'standard' | 'deep' = 'standard'
): string | null {
  const parsed = parseFormula(formulaStr);
  if (!parsed) return null;
  
  const elements = parsed.expression.split('+').filter(e => e.trim());
  if (elements.length === 0) return null;
  
  // 根据期数确定元素数量范围
  const maxElements = periods <= 20 ? 20 : periods <= 50 ? 15 : 10;
  const minElements = 2;
  
  const newElements: string[] = [];
  const recommended = getRecommendedElements(parsed.resultType);
  
  for (const elem of elements) {
    if (Math.random() < mutationRate) {
      // 变异：替换为新元素（优先从推荐元素中选择）
      if (recommended.length > 0) {
        newElements.push(recommended[Math.floor(Math.random() * recommended.length)]);
      } else {
        newElements.push(allElements[Math.floor(Math.random() * allElements.length)]);
      }
    } else {
      newElements.push(elem);
    }
  }
  
  // 增加元素变异的概率和数量
  const addProb = 0.35; // 提高添加概率
  const removeProb = 0.2; // 提高删除概率
  const shuffleProb = 0.15; // 新增：打乱顺序
  
  // 添加新元素
  if (Math.random() < addProb && newElements.length < maxElements) {
    const newElem = recommended.length > 0
      ? recommended[Math.floor(Math.random() * recommended.length)]
      : allElements[Math.floor(Math.random() * allElements.length)];
    const pos = Math.floor(Math.random() * (newElements.length + 1));
    newElements.splice(pos, 0, newElem);
  }
  
  // 删除元素
  if (Math.random() < removeProb && newElements.length > minElements) {
    const pos = Math.floor(Math.random() * newElements.length);
    newElements.splice(pos, 1);
  }
  
  // 打乱顺序（增加多样性）
  if (Math.random() < shuffleProb && newElements.length > 1) {
    for (let i = newElements.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newElements[i], newElements[j]] = [newElements[j], newElements[i]];
    }
  }
  
  // 完全重写（极端情况）
  if (Math.random() < 0.1) {
    return generateFromSeed(
      recommended[Math.floor(Math.random() * recommended.length)] || allElements[0],
      parsed.resultType,
      Math.random() > 0.5 ? 'D' : 'L',
      periods,
      parsed.offset,
      parsed.leftExpand,
      parsed.rightExpand
    );
  }
  
  if (newElements.length < minElements) return null;
  
  const expression = joinElementsWithRandomOperators(newElements);
  const offsetPart = parsed.offset !== 0 ? `补偿${parsed.offset}` : '';
  const leftStr = parsed.leftExpand > 0 ? `左${parsed.leftExpand}` : '';
  const rightStr = parsed.rightExpand > 0 ? `右${parsed.rightExpand}` : '';
  
  return `[${parsed.rule}${parsed.resultType}]${expression}${offsetPart}=${parsed.periods}${leftStr}${rightStr}`;
}

// 进化搜索算法
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
  const results: { formula: string; hitRate: number; hitCount: number; totalPeriods: number }[] = [];
  
  // 容差根据期数动态调整
  const tolerance = periods <= 15 ? 1 : periods <= 30 ? 2 : periods <= 50 ? 3 : periods <= 100 ? 5 : 8;
  
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
      populationSize = 150;
      generations = 15;
      mutationRate = 0.5; // 更激进的变异率
      break;
    case 'standard':
      populationSize = 300;
      generations = 25;
      mutationRate = 0.4;
      break;
    default:
      populationSize = 150;
      generations = 15;
      mutationRate = 0.5;
  }
  
  const totalIterations = populationSize * generations;
  let currentIteration = 0;
  
  // ==================== 多种子初始化 ====================
  // 使用所有元素作为种子，支持跨类型搜索
  const seedElementsByType: Record<ResultType, string[]> = {
    '尾数类': getAllElements(),
    '头数类': getAllElements(),
    '合数类': getAllElements(),
    '波色类': getAllElements(),
    '五行类': getAllElements(),
    '肖位类': getAllElements(),
    '单特类': getAllElements(),
    '大小单双类': getAllElements(),
  };
  
  // 第一阶段：从不同种子元素生成初始种群
  for (const resultType of resultTypes) {
    const seedElements = seedElementsByType[resultType] || [];
    for (const seedElem of seedElements.slice(0, 3)) { // 每个类型取3个种子
      for (const rule of ['D', 'L'] as const) {
        // 基于种子元素生成公式
        const formula = generateFromSeed(seedElem, resultType, rule, periods, offset, leftExpand, rightExpand);
        if (formula && !seenFormulas.has(formula)) {
          seenFormulas.add(formula);
          const parsed = parseFormula(formula);
          if (parsed) {
            const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
            const hitRate = result.hitRate * 100;
            if (Math.abs(hitRate - targetHitRate) <= tolerance * 2) { // 放宽初始容差
              results.push({
                formula,
                hitRate: result.hitRate,
                hitCount: result.hitCount,
                totalPeriods: result.totalPeriods,
              });
            }
          }
        }
        currentIteration++;
      }
    }
  }
  
  // 第二阶段：基于模板生成更多初始解
  for (const resultType of resultTypes) {
    for (const rule of ['D', 'L'] as const) {
      const formula = generateFromTemplate(resultType, rule, periods, offset, leftExpand, rightExpand, strategy);
      if (formula && !seenFormulas.has(formula)) {
        seenFormulas.add(formula);
        const parsed = parseFormula(formula);
        if (parsed) {
          const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
          const hitRate = result.hitRate * 100;
          if (Math.abs(hitRate - targetHitRate) <= tolerance) {
            results.push({
              formula,
              hitRate: result.hitRate,
              hitCount: result.hitCount,
              totalPeriods: result.totalPeriods,
            });
          }
        }
      }
      currentIteration++;
    }
  }
  
  // 第二阶段：基于推荐元素的智能生成
  let bestFormulas = [...results].sort((a, b) => b.hitRate - a.hitRate).slice(0, 20);
  
  for (let gen = 0; gen < generations; gen++) {
    const newPopulation: typeof results = [];
    
    // 从优秀公式变异
    for (const best of bestFormulas) {
      for (let i = 0; i < 3; i++) {
        const mutated = mutateFormula(best.formula, allElements, mutationRate, periods);
        if (mutated && !seenFormulas.has(mutated)) {
          seenFormulas.add(mutated);
          const parsed = parseFormula(mutated);
          if (parsed) {
            // 添加多样性：如果该结果类型的公式已经太多，降低其被加入的概率
            const countByType = results.filter(r => r.formula.includes(parsed.resultType)).length;
            const typeLimit = maxCount / resultTypes.length * 1.5;
            
            if (!(countByType > typeLimit && Math.random() > 0.3)) {
              const result = verifyFormula(parsed, historyData, offset, periods, leftExpand, rightExpand);
              const hitRate = result.hitRate * 100;
              
              if (Math.abs(hitRate - targetHitRate) <= tolerance) {
                // 综合评估适应度，而不仅仅是命中率
                const fitness = evaluateFitness({ ...result, hits: [] }, targetHitRate / 100);
                
                newPopulation.push({
                  formula: mutated,
                  hitRate: result.hitRate,
                  hitCount: result.hitCount,
                  totalPeriods: result.totalPeriods,
                  fitness
                } as any);
              }
            }
          }
        }
        currentIteration++;
        if (currentIteration % 50 === 0) {
          onProgress(currentIteration, totalIterations, results.length, results);
        }
      }
    }
    
    // 随机生成补充
    for (let i = 0; i < populationSize / 2; i++) {
      const resultType = resultTypes[Math.floor(Math.random() * resultTypes.length)];
      const rule = Math.random() < 0.5 ? 'D' : 'L' as const;
      const recommended = getRecommendedElements(resultType);
      
      const elementCount = Math.floor(Math.random() * 5) + 1;
      const shuffled = [...recommended].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, elementCount);
      
      if (selected.length === 0) continue;
      
      const expression = joinElementsWithRandomOperators(selected);
      const randomOffset = Math.floor(Math.random() * 10) - 5;
      const offsetStr = randomOffset >= 0 ? `+${randomOffset}` : `${randomOffset}`;
      
      const formulaStr = `[${rule}${resultType}]${expression}${offsetStr}=${periods}`;
      
      if (seenFormulas.has(formulaStr)) continue;
      seenFormulas.add(formulaStr);
      
      const parsed = parseFormula(formulaStr);
      if (parsed) {
        const result = verifyFormula(parsed, historyData, 0, periods, 0, 0);
        const hitRate = result.hitRate * 100;
        if (Math.abs(hitRate - targetHitRate) <= tolerance) {
          newPopulation.push({
            formula: formulaStr,
            hitRate: result.hitRate,
            hitCount: result.hitCount,
            totalPeriods: result.totalPeriods,
          });
        }
      }
      currentIteration++;
    }
    
    // 合并结果并更新最佳公式
    results.push(...newPopulation);
    bestFormulas = [...results].sort((a, b) => b.hitRate - a.hitRate).slice(0, 20);
    
    onProgress(currentIteration, totalIterations, results.length, results);
    
    if (results.length >= maxCount * 2) break;
  }
  
  return results;
}

// Worker 消息处理
self.onmessage = (event) => {
  const { type, historyData, targetHitRate, maxCount, strategy, resultTypes, offset, periods, leftExpand, rightExpand } = event.data;
  
  if (type !== 'search') return;
  
  try {
    // 使用进化搜索算法
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
    
    // 按命中率排序
    if (targetHitRate >= 50) {
      results.sort((a, b) => b.hitRate - a.hitRate);
    } else {
      results.sort((a, b) => a.hitRate - b.hitRate);
    }
    
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
