// Test to verify consistency between first layer and second layer
// Simulate the logic from ResultDisplay.tsx and calculator.ts

// Mock data
const mockHistoryData = [
  { period: 2026072, numbers: [1,28,10,15,20,25,30], zodiacYear: 7 },
  { period: 2026071, numbers: [2,30,11,16,21,26,35], zodiacYear: 7 },
  { period: 2026070, numbers: [3,17,12,17,22,27,18], zodiacYear: 7 },
  { period: 2026069, numbers: [4,16,13,18,23,28,22], zodiacYear: 7 },
  { period: 2026068, numbers: [5,25,14,19,24,29,26], zodiacYear: 7 },
];

// Mock results (as would come from worker)
const mockResults = [
  {
    formula: { rule: 'L', resultType: '肖位类', expression: '特肖位', offset: 0, periods: 10, leftExpand: 0, rightExpand: 0 },
    targetPeriod: 2026072, // 验证模式
    periodResults: [
      { period: 2026063, result: 1, expandedResults: [1], targetValue: 1, hit: true },
      { period: 2026064, result: 2, expandedResults: [2], targetValue: 2, hit: false },
      { period: 2026065, result: 3, expandedResults: [3], targetValue: 3, hit: true },
      { period: 2026066, result: 4, expandedResults: [4], targetValue: 4, hit: false },
      { period: 2026067, result: 5, expandedResults: [5], targetValue: 5, hit: true },
      { period: 2026068, result: 6, expandedResults: [6], targetValue: 6, hit: false },
      { period: 2026069, result: 7, expandedResults: [7], targetValue: 7, hit: true },
      { period: 2026070, result: 8, expandedResults: [8], targetValue: 8, hit: false },
      { period: 2026071, result: 9, expandedResults: [9], targetValue: 9, hit: true },
      { period: 2026072, result: 10, expandedResults: [10], targetValue: 10, hit: false },
    ],
    hits: [true, false, true, false, true, false, true, false, true, false],
    hitCount: 5,
    totalPeriods: 10,
    results: ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡'],
  }
];

// Simulate second layer logic (from calculator.ts)
function countHitsPerPeriod(results, historyData, targetPeriod, periods = 10) {
  if (historyData.length === 0) return { counts: [], displayPeriod: 0, statsPeriods: [] };

  const displayCount = Math.min(periods, 10);
  let periodsToCount: number[] = [];

  // 预测模式：使用最新期数之前10期
  // 验证模式：使用目标期数之前10期
  let target: number;
  if (targetPeriod !== null && targetPeriod !== undefined) {
    // 验证模式：统计目标期数之前的10期
    target = targetPeriod;
  } else {
    // 预测模式：取最新期数（降序排列，historyData[0]是最新的）
    target = historyData[0]?.period || 0;
  }

  // 统计从 target - (displayCount - 1) 到 target 的期数
  const startPeriod = target - (displayCount - 1);
  // 按期数升序收集（从旧到新）
  for (let p = startPeriod; p <= target; p++) {
    const data = historyData.find(d => d.period === p);
    if (data) {
      periodsToCount.push(p);
    }
  }
  // 保持升序（从旧到新），后面会反转显示

  const counts: number[] = [];

  for (const period of periodsToCount) {
    const periodData = historyData.find(d => d.period === period);
    if (!periodData) {
      counts.push(0);
      continue;
    }
    const actualTeNum = periodData.numbers[6];

    let hitCount = 0;
    // 无论预测还是回溯，都统计每个公式是否命中过本期特码（每公式计1次）
    // 找到该期对应的预测结果（recordedPeriod = period）
    // 验证模式下：period = 059 表示用 058 期数据验证 059 期
    for (const result of results) {
      // 找到该期对应的预测结果（recordedPeriod = period）
      const pr = result.periodResults.find(pr => pr.period === period);
      if (pr && pr.targetValue !== undefined && !isNaN(pr.targetValue)) {
        const zodiacYear = getZodiacYearByPeriod(period);
        let formulaHit = false;
        for (const value of pr.expandedResults) {
          const nums = convertResultToNumbers(
            resultToText(value, result.formula.resultType, zodiacYear),
            result.formula.resultType,
            zodiacYear
          );
          if (nums.includes(actualTeNum)) {
            formulaHit = true;
            break;
          }
        }
        if (formulaHit) {
          hitCount++;
        }
      }
    }
    counts.push(hitCount);
  }

  // 计算显示期数：预测模式用最新期+1，验证模式用目标期
  let displayPeriod: number;
  if (targetPeriod !== null && targetPeriod !== undefined) {
    displayPeriod = targetPeriod;
  } else {
    const latestPeriod = historyData[0]?.period || 0;
    displayPeriod = latestPeriod + 1;
  }

  return { 
    counts: counts.reverse(), 
    displayPeriod,
    statsPeriods: [...periodsToCount].reverse()
  };
}

// Mock helper functions
function getZodiacYearByPeriod(period: number): number {
  return 7;
}

function convertResultToNumbers(text: string, resultType: string, zodiacYear: number): number[] {
  if (resultType === '肖位类') {
    // 简化：假设文本是生肖名称，转回号码
    const map: Record<string, number> = {
      '鼠': 1, '牛': 2, '虎': 3, '兔': 4, '龙': 5, '蛇': 6, '马': 7, '羊': 8, '猴': 9, '鸡': 10, '狗': 11, '猪': 12
    };
    return [map[text] || 0];
  }
  return [parseInt(text)];
}

function resultToText(value: number, resultType: string, zodiacYear: number): string {
  if (resultType === '肖位类') {
    const names = ['', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    return names[value] || '';
  }
  return value.toString();
}

// Run test
const hitStats = countHitsPerPeriod(mockResults, mockHistoryData, 2026072, 10);
console.log('===== 第二层统计 (近10期开出次数) =====');
console.log('显示期数:', hitStats.displayPeriod);
console.log('统计期数:', hitStats.statsPeriods);
console.log('命中次数:', hitStats.counts.join(','));
console.log();

// Simulate first layer logic (from ResultDisplay.tsx)
mockResults.forEach((result, index) => {
  // 获取要显示的10期数据（根据验证目标期数）
  const savedTargetPeriod = result.targetPeriod;
  const statsTarget = savedTargetPeriod !== null && savedTargetPeriod !== undefined 
    ? savedTargetPeriod - 1  // 验证模式：统计目标期之前10期
    : mockHistoryData[0].period - 1;       // 预测模式：统计最新期之前10期
  const startPeriod = statsTarget - 9;
  
  // 从 periodResults 中提取这10期的命中数据
  const displayHits: boolean[] = [];
  for (let p = startPeriod; p <= statsTarget; p++) {
    const pr = result.periodResults.find(pr => pr.period === p);
    // 只有当 targetValue 有效时才计入命中
    const isValidHit = pr && pr.targetValue !== undefined && !isNaN(pr.targetValue);
    displayHits.push(isValidHit ? (pr.hit ?? false) : false);
  }
  
  // 使用显示的10期中的实际命中次数
  const displayHitCount = displayHits.filter(h => h).length;
  
  // 生成第一层文本（简化版）
  const hitsStr = displayHits.map(h => h ? '★' : '☆').join('');
  console.log(`[${String(index+1).padStart(3, '0')}]${hitsStr}≡10中${displayHitCount}次=${result.results.join(',')}`);
});

console.log('\n===== 对比 =====');
console.log('第二层命中次数:', hitStats.counts.join(','));
console.log('第一层命中次数应与第二层中间的10期一致');