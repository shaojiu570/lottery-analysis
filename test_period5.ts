import { verifyFormula } from './src/utils/workerShared';

const historyData = [
  { period: 2026072, numbers: [1,28,10,15,20,25,30], zodiacYear: 7 },  // 未开
  { period: 2026071, numbers: [2,30,11,16,21,26,35], zodiacYear: 7 },  // 最新已开
  { period: 2026070, numbers: [3,17,12,17,22,27,18], zodiacYear: 7 },
  { period: 2026069, numbers: [4,16,13,18,23,28,22], zodiacYear: 7 },
  { period: 2026068, numbers: [5,25,14,19,24,29,26], zodiacYear: 7 },
];

const formula = {
  rule: 'L',
  resultType: '肖位类',
  expression: '特肖位',
  offset: 0,
  periods: 10,
  leftExpand: 0,
  rightExpand: 0,
};

console.log('===== 预测模式 (预测072) =====');
const r1 = verifyFormula(formula, historyData, null, 10, 0, 0, 0, [], [], new Map());
console.log('periodResults:');
r1.periodResults.forEach(pr => console.log(`  period=${pr.period}, result=${pr.result}`));
console.log('latestResultsForSummary:', r1.results);

console.log('\n===== 验证模式: 目标期=2026072 =====');
const r2 = verifyFormula(formula, historyData, 2026072, 10, 0, 0, 0, [], [], new Map());
console.log('periodResults:');
r2.periodResults.forEach(pr => console.log(`  period=${pr.period}, result=${pr.result}`));
console.log('latestResultsForSummary:', r2.results);