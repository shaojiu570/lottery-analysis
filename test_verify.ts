import { verifyFormula } from './src/utils/workerShared';

// 模拟历史数据
const historyData = [
  { period: 2026072, numbers: [1,5,10,15,20,25,30], zodiacYear: 7 },
  { period: 2026071, numbers: [2,6,11,16,21,26,31], zodiacYear: 7 },
  { period: 2026070, numbers: [3,7,12,17,22,27,32], zodiacYear: 7 },
  { period: 2026069, numbers: [4,8,13,18,23,28,33], zodiacYear: 7 },
  { period: 2026068, numbers: [5,9,14,19,24,29,34], zodiacYear: 7 },
  { period: 2026067, numbers: [6,10,15,20,25,30,35], zodiacYear: 7 },
  { period: 2026066, numbers: [7,11,16,21,26,31,36], zodiacYear: 7 },
  { period: 2026065, numbers: [8,12,17,22,27,32,37], zodiacYear: 7 },
  { period: 2026064, numbers: [9,13,18,23,28,33,38], zodiacYear: 7 },
  { period: 2026063, numbers: [10,14,19,24,29,34,39], zodiacYear: 7 },
];

// 公式: [L波色类]平2合+0=25
const formula = {
  rule: 'L',
  resultType: '波色类',
  expression: '平2合',
  offset: 0,
  periods: 25,  // 公式定义的期数
  leftExpand: 0,
  rightExpand: 0,
};

console.log('========== 测试：公式 periods=25 ==========');
console.log('公式定义的 periods:', formula.periods);

console.log('\n--- 传入 periods=25 (公式定义的) ---');
const result1 = verifyFormula(
  formula,
  historyData,
  null,  // targetPeriod = null (预测模式)
  25,    // periods = 25
  0,
  0,
  0,
  [], [], new Map()
);
console.log('results:', result1.results);

console.log('\n--- 传入 periods=10 (设置中的) ---');
const result2 = verifyFormula(
  formula,
  historyData,
  null,
  10,    // periods = 10
  0,
  0,
  0,
  [], [], new Map()
);
console.log('results:', result2.results);