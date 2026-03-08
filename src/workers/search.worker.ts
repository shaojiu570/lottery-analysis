import type { LotteryData, ResultType, CustomElement, CustomResultType } from '../types';
import * as shared from '../utils/workerShared';

// 存储自定义数据
let workerCustomElements: CustomElement[] = [];
let workerCustomResultTypes: CustomResultType[] = [];
let workerPrecomputedMap = new Map<number, shared.PrecomputedData[]>();

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
  外部数据组: ['星期'],  // 简化：只保留星期元素
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
  // 直接从 ELEMENT_GROUPS 中获取所有内置元素名，并加上自定义元素
  const allBuiltInElements = Object.values(ELEMENT_GROUPS).flat();
  const customElements = workerCustomElements.map(e => e.name);
  const allElements = [...new Set([...allBuiltInElements, ...customElements])];
  
  // 推荐元素在前，其他元素在后
  const otherElements = allElements.filter(e => !recommended.includes(e));
  return [...recommended, ...otherElements];
}

// 智能元素选择器
function selectSmartElements(
  resultType: ResultType,
  count: number,
  pattern?: FormulaPattern,
  historyData?: LotteryData[]
): string[] {
  const allElements = getAllAvailableElements(resultType);
  if (allElements.length === 0) return [];
  
  // 如果有模式学习结果，使用智能选择
  if (pattern && historyData) {
    const elementScores = new Map<string, number>();
    
    for (const element of allElements) {
      let score = 0;
      
      // 基础频率分数
      const freqIndex = pattern.commonElements.indexOf(element);
      if (freqIndex !== -1) {
        score += (10 - freqIndex) * 0.3; // 排名越靠前分数越高
      }
      
      // 协同效应分数
      for (const [pair, pairFreq] of pattern.elementPairs.entries()) {
        if (pair.includes(element)) {
          score += Math.log(pairFreq + 1) * 0.2;
        }
      }
      
      // 性能趋势分数
      const performance = analyzeElementPerformance(element, [], historyData);
      score += performance.recentHitRate * 0.3;
      score += performance.consistencyScore * 0.1;
      score += performance.synergyScore * 0.1;
      
      elementScores.set(element, score);
    }
    
    // 按分数排序并选择
    return Array.from(elementScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([element]) => element);
  }
  
  // 回退到随机选择
  const shuffled = [...allElements].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ==================== 增强模式学习系统 ====================
interface ElementPattern {
  element: string;
  avgHitRate: number;
  frequency: number;
  bestPairs: string[];
  timeDecayScore: number;  // 新增：时间衰减分数
  typeSpecificScore: Map<ResultType, number>;  // 新增：类型特定分数
  volatilityScore: number;  // 新增：波动性分数
}

interface FormulaPattern {
  elementCount: number;
  avgHitRate: number;
  commonElements: string[];
  elementPairs: Map<string, number>;
  successfulStructures: string[];  // 新增：成功的结构模式
  optimalPeriods: Map<number, number>;  // 新增：最优期数配置
}

interface ElementPerformance {
  element: string;
  recentHitRate: number;  // 最近10期命中率
  overallHitRate: number;  // 总体命中率
  trendDirection: 'up' | 'down' | 'stable';  // 趋势方向
  consistencyScore: number;  // 一致性分数
  synergyScore: number;  // 协同效应分数
}

// 增强的模式学习缓存
const patternCache = new Map<string, FormulaPattern>();
const elementPerformanceCache = new Map<string, ElementPerformance>();
const successfulFormulasCache = new Map<string, Array<{ formula: string; hitRate: number; timestamp: number }>>();

// 计算元素的时间衰减分数
function calculateTimeDecayScore(elementFreq: Map<string, number>, totalElements: number): Map<string, number> {
  const decayScores = new Map<string, number>();
  const now = Date.now();
  
  for (const [element, freq] of elementFreq.entries()) {
    // 基础分数 + 时间衰减
    const baseScore = freq / totalElements;
    const timeFactor = Math.exp(-Math.log(0.5) * (now % 86400000) / 86400000); // 24小时衰减
    decayScores.set(element, baseScore * timeFactor);
  }
  
  return decayScores;
}

// 分析元素性能趋势
function analyzeElementPerformance(
  element: string,
  results: Array<{ formula: string; hitRate: number; timestamp?: number }>,
  historyData: LotteryData[]
): ElementPerformance {
  const cacheKey = `${element}_${historyData.length}`;
  if (elementPerformanceCache.has(cacheKey)) {
    return elementPerformanceCache.get(cacheKey)!;
  }
  
  // 提取包含该元素的所有公式
  const elementFormulas = results.filter(r => 
    parseFormula(r.formula)?.expression.includes(element)
  );
  
  if (elementFormulas.length === 0) {
    return {
      element,
      recentHitRate: 0,
      overallHitRate: 0,
      trendDirection: 'stable',
      consistencyScore: 0,
      synergyScore: 0
    };
  }
  
  // 计算最近表现和总体表现
  const recentFormulas = elementFormulas.slice(-10);
  const recentHitRate = recentFormulas.reduce((sum, f) => sum + f.hitRate, 0) / recentFormulas.length;
  const overallHitRate = elementFormulas.reduce((sum, f) => sum + f.hitRate, 0) / elementFormulas.length;
  
  // 计算趋势方向
  const recentAvg = recentFormulas.slice(-5).reduce((sum, f) => sum + f.hitRate, 0) / Math.min(5, recentFormulas.length);
  const olderAvg = recentFormulas.slice(0, 5).reduce((sum, f) => sum + f.hitRate, 0) / Math.min(5, recentFormulas.length);
  const trendDirection = recentAvg > olderAvg + 0.05 ? 'up' : 
                        recentAvg < olderAvg - 0.05 ? 'down' : 'stable';
  
  // 计算一致性分数（命中率的方差）
  const variance = elementFormulas.reduce((sum, f) => {
    return sum + Math.pow(f.hitRate - overallHitRate, 2);
  }, 0) / elementFormulas.length;
  const consistencyScore = Math.max(0, 1 - variance);
  
  // 计算协同效应分数（与其他元素的组合效果）
  const synergyScore = calculateSynergyScore(element, elementFormulas);
  
  const performance: ElementPerformance = {
    element,
    recentHitRate,
    overallHitRate,
    trendDirection,
    consistencyScore,
    synergyScore
  };
  
  elementPerformanceCache.set(cacheKey, performance);
  return performance;
}

// 计算协同效应分数
function calculateSynergyScore(element: string, elementFormulas: Array<{ formula: string; hitRate: number }>): number {
  const coElements = new Map<string, number[]>();
  
  for (const formula of elementFormulas) {
    const parsed = parseFormula(formula.formula);
    if (!parsed) continue;
    
    const elements = parsed.expression.split(/[+\-*/]/).filter(e => e.trim() && e !== element);
    for (const coElement of elements) {
      if (!coElements.has(coElement)) {
        coElements.set(coElement, []);
      }
      coElements.get(coElement)!.push(formula.hitRate);
    }
  }
  
  // 计算平均协同效应
  let totalSynergy = 0;
  let count = 0;
  
  for (const [coElement, hitRates] of coElements.entries()) {
    if (hitRates.length >= 3) {
      const avgHitRate = hitRates.reduce((sum, rate) => sum + rate, 0) / hitRates.length;
      totalSynergy += avgHitRate;
      count++;
    }
  }
  
  return count > 0 ? totalSynergy / count : 0;
}

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
      successfulStructures: [],
      optimalPeriods: new Map(),
    };
  }
  
  const elementFreq = new Map<string, number>();
  const pairFreq = new Map<string, number>();
  const structureFreq = new Map<string, number>();
  const periodPerformance = new Map<number, number[]>();
  let totalElements = 0;
  let totalHitRate = 0;
  
  for (const result of highHitFormulas) {
    const parsed = parseFormula(result.formula);
    if (!parsed) continue;
    
    const elements = parsed.expression.split(/[+\-*/]/).filter(e => e.trim());
    totalElements += elements.length;
    totalHitRate += result.hitRate;
    
    // 统计元素频率
    for (const elem of elements) {
      elementFreq.set(elem, (elementFreq.get(elem) || 0) + 1);
    }
    
    // 统计元素对频率
    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const pair = `${elements[i]}+${elements[j]}`;
        pairFreq.set(pair, (pairFreq.get(pair) || 0) + 1);
      }
    }
    
    // 统计结构模式
    const structure = extractStructure(parsed.expression);
    structureFreq.set(structure, (structureFreq.get(structure) || 0) + 1);
    
    // 统计期数性能
    const periodKey = parsed.periods || 10;
    if (!periodPerformance.has(periodKey)) {
      periodPerformance.set(periodKey, []);
    }
    periodPerformance.get(periodKey)!.push(result.hitRate);
  }
  
  // 提取最常见的元素
  const commonElements = Array.from(elementFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([elem]) => elem);
  
  // 提取最成功的结构
  const successfulStructures = Array.from(structureFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([structure]) => structure);
  
  // 计算最优期数配置
  const optimalPeriods = new Map<number, number>();
  for (const [period, hitRates] of periodPerformance.entries()) {
    const avgHitRate = hitRates.reduce((sum, rate) => sum + rate, 0) / hitRates.length;
    optimalPeriods.set(period, avgHitRate);
  }
  
  return {
    elementCount: Math.round(totalElements / highHitFormulas.length),
    avgHitRate: totalHitRate / highHitFormulas.length,
    commonElements,
    elementPairs: pairFreq,
    successfulStructures,
    optimalPeriods,
  };
}

// 提取公式结构模式
function extractStructure(expression: string): string {
  // 将具体元素替换为类型标识符
  return expression
    .replace(/\b(期数|总分|平[1-6]号|特号)\b/g, 'NUM')
    .replace(/\b(平[1-6]头|特头)\b/g, 'HEAD')
    .replace(/\b(平[1-6]尾|特尾)\b/g, 'TAIL')
    .replace(/\b(平[1-6]合|特合)\b/g, 'SUM')
    .replace(/\b(平[1-6]波|特波)\b/g, 'WAVE')
    .replace(/\b(平[1-6]行|特行)\b/g, 'ROW')
    .replace(/\b(平[1-6]段|特段)\b/g, 'SEG')
    .replace(/\b(平[1-6]肖位|特肖位)\b/g, 'ZODIAC')
    .replace(/\d+/g, 'N');
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
  offset: number,
  targetPeriod: number | null
): number {
  const cacheKey = `${element}_${resultType}_${rule}_${periods}_${offset}_${targetPeriod}`;
  
  if (singleElementCache.has(cacheKey)) {
    return singleElementCache.get(cacheKey)!;
  }
  
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const formula = `[${rule}${resultType}]${element}${offsetStr}=${periods}`;
  const parsed = parseFormula(formula, workerCustomResultTypes);
  if (!parsed) return 0;
  
  const result = shared.verifyFormula(
    parsed,
    historyData,
    targetPeriod,
    periods,
    0,
    0,
    offset,
    workerCustomElements,
    workerCustomResultTypes,
    workerPrecomputedMap
  );
  const score = result.hitCount / result.totalPeriods;
  
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
  offset: number,
  targetPeriod: number | null
): number {
  const pairKey = [elem1, elem2].sort().join('+');
  const cacheKey = `${pairKey}_${resultType}_${rule}_${periods}_${offset}_${targetPeriod}`;
  
  if (elementPairCache.has(cacheKey)) {
    return elementPairCache.get(cacheKey)!;
  }
  
  const offsetStr = offset >= 0 ? `+${offset}` : `${offset}`;
  const formula = `[${rule}${resultType}]${elem1}+${elem2}${offsetStr}=${periods}`;
  const parsed = parseFormula(formula, workerCustomResultTypes);
  if (!parsed) return 0;
  
  const result = shared.verifyFormula(
    parsed,
    historyData,
    targetPeriod,
    periods,
    0,
    0,
    offset,
    workerCustomElements,
    workerCustomResultTypes,
    workerPrecomputedMap
  );
  const score = result.hitCount / result.totalPeriods;
  
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
  targetPeriod: number | null,
  topN: number = 20
): string[] {
  // 使用所有可用元素，不仅仅是推荐元素
  const allAvailable = getAllAvailableElements(resultType);
  const elementScores: Array<{ element: string; score: number; diff: number }> = [];
  
  for (const elem of allAvailable) {
    const score = evaluateSingleElement(elem, resultType, rule, historyData, periods, offset, targetPeriod);
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
  targetPeriod: number | null,
  topN: number = 15
): Array<[string, string]> {
  const pairScores: Array<{ elem1: string; elem2: string; score: number; diff: number }> = [];
  
  for (let i = 0; i < topElements.length && i < 15; i++) {
    for (let j = i + 1; j < topElements.length && j < 15; j++) {
      const score = evaluateElementPair(topElements[i], topElements[j], resultType, rule, historyData, periods, offset, targetPeriod);
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
  targetPeriod: number | null,
  pattern?: FormulaPattern,
  allResultTypes?: ResultType[]
): Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> {
  const results: Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> = [];
  const seenFormulas = new Set<string>();
  const seenFormulaKeys = new Set<string>(); // 新增：标准化公式键集合
  
  // 使用模式学习的元素数量建议
  const suggestedCount = pattern?.elementCount || 3;
  const minElements = Math.max(2, suggestedCount - 2);
  const maxElements = Math.min(8, suggestedCount + 3);
  
  for (const [elem1, elem2] of topPairs) {
    // 2元素公式 - 当前类型
    const formula2 = buildFormula([elem1, elem2], resultType, rule, periods, offset, leftExpand, rightExpand);
    if (formula2 && !seenFormulas.has(formula2)) {
      seenFormulas.add(formula2);
      const result = verifyFormulaString(formula2, historyData, offset, periods, leftExpand, rightExpand, targetPeriod);
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
        seenFormulas,
        seenFormulaKeys,
        targetPeriod
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
        const result = verifyFormulaString(formula, historyData, offset, periods, leftExpand, rightExpand, targetPeriod);
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
            const result = verifyFormulaString(crossFormula, historyData, offset, periods, leftExpand, rightExpand, targetPeriod);
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
  // 使用与normalizeExpressionForDedup相同的排序逻辑
  const sortedElements = [...elements].sort((a, b) => a.localeCompare(b, 'zh-CN'));
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
  seenFormulas: Set<string>,
  seenFormulaKeys: Set<string>, // 新增参数
  targetPeriod: number | null
): Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> {
  const results: Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> = [];
  
  // 对每个结果类型都尝试这组元素
  for (const resultType of resultTypes) {
    const formula = buildFormula(elements, resultType, rule, periods, offset, leftExpand, rightExpand);
    if (!formula) continue;
    
    // 双重重复检测
    const formulaKey = generateSearchFormulaKey(formula);
    if (seenFormulas.has(formula) || seenFormulaKeys.has(formulaKey)) continue;
    
    seenFormulas.add(formula);
    seenFormulaKeys.add(formulaKey);
    const result = verifyFormulaString(formula, historyData, offset, periods, leftExpand, rightExpand, targetPeriod);
    
    if (result && Math.abs(result.hitRate * 100 - targetHitRate) <= tolerance) {
      results.push(result);
    }
  }
  
  return results;
}

// 验证公式字符串
import { parseFormula, generateFormulaKey } from '../utils/formulaParser';

function verifyFormulaString(
  formulaStr: string,
  historyData: LotteryData[],
  offset: number,
  periods: number,
  leftExpand: number,
  rightExpand: number,
  targetPeriod: number | null
): { formula: string; hitRate: number; hitCount: number; totalPeriods: number } | null {
  const parsed = parseFormula(formulaStr, workerCustomResultTypes);
  if (!parsed) return null;
  
  const result = shared.verifyFormula(
    parsed,
    historyData,
    targetPeriod,
    periods,
    leftExpand,
    rightExpand,
    offset,
    workerCustomElements,
    workerCustomResultTypes,
    workerPrecomputedMap
  );
  
  return {
    formula: formulaStr,
    hitRate: result.hitCount / result.totalPeriods,
    hitCount: result.hitCount,
    totalPeriods: result.totalPeriods,
  };
}

// 生成标准化的公式键用于去重
function generateSearchFormulaKey(formulaStr: string): string {
  const parsed = parseFormula(formulaStr, workerCustomResultTypes);
  if (!parsed) return formulaStr; // 如果解析失败，返回原字符串作为键
  return generateFormulaKey(parsed);
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
  targetPeriod: number | null,  // 添加目标期数参数
  onProgress: (current: number, total: number, found: number, currentResults?: any[]) => void
): Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> {
  const allResults: Array<{ formula: string; hitRate: number; hitCount: number; totalPeriods: number }> = [];
  const seenFormulas = new Set<string>();
  const seenFormulaKeys = new Set<string>(); // 新增：标准化公式键集合
  
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
      const topElements = findTopElements(resultType, rule, historyData, targetHitRate, periods, offset, targetPeriod, topElementsCount);
      currentStep++;
      onProgress(currentStep, totalSteps, allResults.length, allResults);
      
      // 第二层：找优质元素对
      const topPairs = findTopPairs(topElements, resultType, rule, historyData, targetHitRate, periods, offset, targetPeriod, topPairsCount);
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
        targetPeriod,  // 传入目标期数
        pattern,
        resultTypes  // 传入所有结果类型
      );
      
      // 更新模式学习
      if (results.length > 0) {
        pattern = learnPatterns(results, targetHitRate / 100 * 0.8);
        patternCache.set(cacheKey, pattern);
      }
      
      for (const r of results) {
        // 双重重复检测：原始字符串 + 标准化键
        const formulaKey = generateSearchFormulaKey(r.formula);
        if (!seenFormulas.has(r.formula) && !seenFormulaKeys.has(formulaKey)) {
          seenFormulas.add(r.formula);
          seenFormulaKeys.add(formulaKey);
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
    if (!formulaStr) continue;
    
    // 双重重复检测
    const formulaKey = generateSearchFormulaKey(formulaStr);
    if (seenFormulas.has(formulaStr) || seenFormulaKeys.has(formulaKey)) continue;
    
    seenFormulas.add(formulaStr);
    seenFormulaKeys.add(formulaKey);
    const result = verifyFormulaString(formulaStr, historyData, offset, periods, leftExpand, rightExpand, targetPeriod);
    
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
    const explorationCount = strategy === 'deep' ? 500 : 200;
    
    for (let i = 0; i < explorationCount && allResults.length < maxCount; i++) {
      const currentResultType = resultTypes[Math.floor(Math.random() * resultTypes.length)];
      const currentRule = Math.random() < 0.5 ? 'D' : 'L' as const;
      
      // 使用智能元素选择
      const allAvailableElements = getAllAvailableElements(currentResultType);
      const currentElementCount = 2 + Math.floor(Math.random() * 4);
      const shuffled = [...allAvailableElements].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, currentElementCount);
      
      const formulaStr = buildFormula(selected, currentResultType, currentRule, periods, offset, leftExpand, rightExpand);
      if (!formulaStr) continue;
      
      // 双重重复检测
      const formulaKey = generateSearchFormulaKey(formulaStr);
      if (seenFormulas.has(formulaStr) || seenFormulaKeys.has(formulaKey)) continue;
      
      seenFormulas.add(formulaStr);
      seenFormulaKeys.add(formulaKey);
      const result = verifyFormulaString(formulaStr, historyData, offset, periods, leftExpand, rightExpand, targetPeriod);
      
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
          seenFormulas,
          seenFormulaKeys,
          targetPeriod
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
  const { 
    type, 
    historyData, 
    targetHitRate, 
    maxCount, 
    strategy, 
    resultTypes, 
    offset, 
    periods, 
    leftExpand, 
    rightExpand, 
    targetPeriod,
    customElements,
    customResultTypes
  } = event.data;
  
  if (type !== 'search') return;
  
  // 更新自定义数据
  if (customElements) workerCustomElements = customElements;
  if (customResultTypes) workerCustomResultTypes = customResultTypes;
  
  // 预计算所有历史数据的元素值
  workerPrecomputedMap = shared.precomputeAllElementValues(historyData);
  
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
      targetPeriod,  // 传入目标期数
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
