import { verifyFormula } from './src/utils/workerShared';

// numbers: [平1, 平2, 平3, 平4, 平5, 平6, 特码]
const historyData = [
  { period: 2026072, numbers: [1,28,10,15,20,25,30], zodiacYear: 7 },  // 平2=28, 特码=30
  { period: 2026071, numbers: [2,30,11,16,21,26,35], zodiacYear: 7 },  // 平2=30, 特码=35
  { period: 2026070, numbers: [3,17,12,17,22,27,18], zodiacYear: 7 },  // 平2=17, 特码=18
  { period: 2026069, numbers: [4,16,13,18,23,28,22], zodiacYear: 7 },  // 平2=16, 特码=22
  { period: 2026068, numbers: [5,25,14,19,24,29,26], zodiacYear: 7 },  // 平2=25, 特码=26
];

const formula = {
  rule: 'L',
  resultType: '波色类',
  expression: '平2合',
  offset: 0,
  periods: 5,
  leftExpand: 0,
  rightExpand: 0,
};

console.log('===== 公式 [L波色类]平2合+0=5 =====\n');

const result = verifyFormula(
  formula,
  historyData,
  null,  // 预测模式
  5,     // periods
  0, 0, 0,
  [], [], new Map()
);

console.log('hits (从旧到新):', result.hits);
console.log('hitCount:', result.hitCount);
console.log('totalPeriods:', result.totalPeriods);
console.log('results:', result.results);

console.log('\n--- periodResults ---');
result.periodResults.forEach((pr, i) => {
  console.log(`${i}: period=${pr.period}, result=${pr.result}, hit=${pr.hit}, expandedResults=${pr.expandedResults}`);
});