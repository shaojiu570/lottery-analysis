import { verifyFormula } from './src/utils/workerShared';

const historyData = [
  { period: 2026072, numbers: [1,28,10,15,20,25,30], zodiacYear: 7 },
  { period: 2026071, numbers: [2,30,11,16,21,26,35], zodiacYear: 7 },
  { period: 2026070, numbers: [3,17,12,17,22,27,18], zodiacYear: 7 },
  { period: 2026069, numbers: [4,16,13,18,23,28,22], zodiacYear: 7 },
  { period: 2026068, numbers: [5,25,14,19,24,29,26], zodiacYear: 7 },
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

console.log('===== 验证模式: 目标期=2026070 =====');
const result2 = verifyFormula(formula, historyData, 2026070, 5, 0, 0, 0, [], [], new Map());
console.log('hits:', result2.hits);
console.log('hitCount:', result2.hitCount);
console.log('totalPeriods:', result2.totalPeriods);
console.log('periodResults:');
result2.periodResults.forEach((pr, i) => {
  console.log(`  ${i}: period=${pr.period}, result=${pr.result}, hit=${pr.hit}, targetValue=${pr.targetValue}`);
});