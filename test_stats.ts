import { countHitsPerPeriod, groupByResultType, aggregateAllNumbers } from './src/utils/calculator';
import { getZodiacMap } from './src/utils/mappings';

console.log('========== 统一使用预测模式示例 ==========\n');

// 模拟历史数据（简化版）
const historyData = [
  { period: 2026010, numbers: [1,5,10,15,20,25,30], zodiacYear: 7 },
  { period: 2026009, numbers: [2,6,11,16,21,26,31], zodiacYear: 7 },
  { period: 2026008, numbers: [3,7,12,17,22,27,32], zodiacYear: 7 },
  { period: 2026007, numbers: [4,8,13,18,23,28,33], zodiacYear: 7 },
  { period: 2026006, numbers: [5,9,14,19,24,29,34], zodiacYear: 7 },
  { period: 2026005, numbers: [6,10,15,20,25,30,35], zodiacYear: 7 },
  { period: 2026004, numbers: [7,11,16,21,26,31,36], zodiacYear: 7 },
  { period: 2026003, numbers: [8,12,17,22,27,32,37], zodiacYear: 7 },
  { period: 2026002, numbers: [9,13,18,23,28,33,38], zodiacYear: 7 },
  { period: 2026001, numbers: [10,14,19,24,29,34,39], zodiacYear: 7 },
  { period: 2025120, numbers: [11,15,20,25,30,35,40], zodiacYear: 6 },
  { period: 2025119, numbers: [12,16,21,26,31,36,41], zodiacYear: 6 },
];

// 模拟验证结果
const results = [
  {
    formula: { rule: 'D', resultType: '肖位类', expression: '特肖位', offset: 0, periods: 10, leftExpand: 0, rightExpand: 0 },
    hits: [true, false, true, false, true, false, true, false, true, false],
    hitCount: 5,
    totalPeriods: 10,
    hitRate: 0.5,
    results: ['龙', '蛇', '马'],
    periodResults: [
      { period: 2026010, result: 5, expandedResults: [5], targetValue: 1, hit: true },
      { period: 2026009, result: 6, expandedResults: [6], targetValue: 2, hit: false },
      { period: 2026008, result: 7, expandedResults: [7], targetValue: 3, hit: true },
      { period: 2026007, result: 8, expandedResults: [8], targetValue: 4, hit: false },
      { period: 2026006, result: 9, expandedResults: [9], targetValue: 5, hit: true },
      { period: 2026005, result: 10, expandedResults: [10], targetValue: 6, hit: false },
      { period: 2026004, result: 11, expandedResults: [11], targetValue: 7, hit: true },
      { period: 2026003, result: 12, expandedResults: [12], targetValue: 8, hit: false },
      { period: 2026002, result: 1, expandedResults: [1], targetValue: 9, hit: true },
      { period: 2026001, result: 2, expandedResults: [2], targetValue: 10, hit: false },
    ],
    targetPeriod: null,
  },
  {
    formula: { rule: 'D', resultType: '波色类', expression: '特波', offset: 0, periods: 10, leftExpand: 0, rightExpand: 0 },
    hits: [true, true, false, true, false, false, true, true, false, false],
    hitCount: 5,
    totalPeriods: 10,
    hitRate: 0.5,
    results: ['红波', '蓝波'],
    periodResults: [
      { period: 2026010, result: 0, expandedResults: [0], targetValue: 0, hit: true },
      { period: 2026009, result: 1, expandedResults: [1], targetValue: 1, hit: true },
      { period: 2026008, result: 2, expandedResults: [2], targetValue: 2, hit: false },
      { period: 2026007, result: 0, expandedResults: [0], targetValue: 0, hit: true },
      { period: 2026006, result: 1, expandedResults: [1], targetValue: 1, hit: false },
      { period: 2026005, result: 2, expandedResults: [2], targetValue: 2, hit: false },
      { period: 2026004, result: 0, expandedResults: [0], targetValue: 0, hit: true },
      { period: 2026003, result: 1, expandedResults: [1], targetValue: 1, hit: true },
      { period: 2026002, result: 2, expandedResults: [2], targetValue: 2, hit: false },
      { period: 2026001, result: 0, expandedResults: [0], targetValue: 0, hit: false },
    ],
    targetPeriod: null,
  },
];

// 计算
const allNumberCounts = aggregateAllNumbers(results);
const { countsMap, formulaCountByType } = groupByResultType(results, historyData);

// 预测模式测试
console.log('========== 预测模式测试 ==========');
const hitStats1 = countHitsPerPeriod(results, allNumberCounts, historyData, undefined, 10);
console.log(`【近10期开出次数】预测期数 ${hitStats1.displayPeriod}`);
console.log('  期数: ' + hitStats1.statsPeriods.map(p => p.toString().slice(-3)).join(' '));
console.log('  命中: ' + hitStats1.counts.map(c => c.toString().padStart(2, '0')).join(', '));
console.log('');

// 验证模式测试
console.log('========== 验证模式测试 ==========');
const hitStats2 = countHitsPerPeriod(results, allNumberCounts, historyData, 2026009, 10);
console.log(`【近10期开出次数】验证期数 ${hitStats2.displayPeriod}`);
console.log('  期数: ' + hitStats2.statsPeriods.map(p => p.toString().slice(-3)).join(' '));
console.log('  命中: ' + hitStats2.counts.map(c => c.toString().padStart(2, '0')).join(', '));
console.log('');

// 显示各结果类型
console.log('【各结果类型统计】');
countsMap.forEach((counts, type) => {
  console.log(`\n${type}:`);
  const byCount = new Map<number, string[]>();
  counts.forEach((count, result) => {
    if (!byCount.has(count)) byCount.set(count, []);
    byCount.get(count)!.push(result);
  });
  const sortedCounts = Array.from(byCount.entries()).sort((a, b) => a[0] - b[0]);
  sortedCounts.forEach(([count, resultList]) => {
    console.log(`  ${count}次: ${resultList.join(', ')}`);
  });
});