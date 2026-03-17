import { parseFormula } from './src/utils/formulaParser';

console.log('========== 测试公式解析 ==========');

// 测试公式
const testFormulas = [
  '[L波色类]平2合+0=25',
  '[L波色类]平2合+0=10',
  '[D肖位类]特肖位=10',
];

for (const formula of testFormulas) {
  console.log(`\n公式: ${formula}`);
  const parsed = parseFormula(formula, [], {});
  if (parsed) {
    console.log('  解析结果:', {
      rule: parsed.rule,
      resultType: parsed.resultType,
      expression: parsed.expression,
      offset: parsed.offset,
      periods: parsed.periods,
      leftExpand: parsed.leftExpand,
      rightExpand: parsed.rightExpand,
    });
  } else {
    console.log('  解析失败');
  }
}