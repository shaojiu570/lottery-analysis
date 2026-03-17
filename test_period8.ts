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
  periods: 10,
  leftExpand: 0,
  rightExpand: 0,
};

console.log('===== 验证模式: 目标期=2026072 =====');
console.log('需要找068期的数据');
const r1 = verifyFormula(formula, historyData, 2026072, 10, 0, 0, 0, [], [], new Map());
console.log('所有periodResults:');
r1.periodResults.forEach(pr => console.log(`  recordedPeriod=${pr.period}, result=${pr.result}, targetValue=${pr.targetValue}, hit=${pr.hit}`));

// 查找068期对应的记录
const pr068 = r1.periodResults.find(pr => pr.period === 2026068);
console.log('\n查找 recordedPeriod=2026068:', pr068);

// 实际应该是：068期应该用067期数据计算，recordedPeriod应该是068
// 但可能记录成了其他值