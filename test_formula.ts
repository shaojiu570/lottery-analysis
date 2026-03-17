import { parseFormulas } from './src/utils/formulaParser';

console.log('========== 测试不同公式格式 ==========');

const testCases = [
  '[L波色类]平2合+0=25',
  '[L波色类]平2合+0',
  '[L波色类]平2合+0=10',
  '[L波色类]平2合+0=20',
];

for (const formula of testCases) {
  console.log(`\n公式: "${formula}"`);
  const { formulas, errors } = parseFormulas(formula, [], {});
  console.log('  解析结果:');
  if (formulas.length > 0) {
    console.log('    periods:', formulas[0].periods);
    console.log('    offset:', formulas[0].offset);
    console.log('    expression:', formulas[0].expression);
  }
  if (errors.length > 0) {
    console.log('  errors:', errors);
  }
}