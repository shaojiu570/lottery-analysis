
import { parseFormula } from './src/utils/formulaParser';
import { verifyFormula, precomputeAllElementValues } from './src/utils/calculator';
import { LotteryData } from './src/types';

// Mock history data
const mockHistory: LotteryData[] = [
  {
    period: 2026002,
    numbers: [1, 2, 3, 4, 5, 6, 7], // TeNum = 7 (Horse in 2026)
    timestamp: Date.now(),
    zodiacYear: 7, // 2026 is Horse year
  },
  {
    period: 2026001,
    numbers: [10, 11, 12, 13, 14, 15, 16], // TeNum = 16 (Rabbit)
    timestamp: Date.now() - 86400000,
    zodiacYear: 7,
  }
];

// Precompute values
precomputeAllElementValues(mockHistory);

const testCases = [
  { name: '尾数类', formula: '[L尾数类]特码=2026002' },
  { name: '头数类', formula: '[L头数类]特码=2026002' },
  { name: '合数类', formula: '[L合数类]特码=2026002' },
  { name: '波色类', formula: '[L波色类]特码=2026002' },
  { name: '五行类', formula: '[L五行类]特码=2026002' },
  { name: '肖位类', formula: '[L肖位类]特码=2026002' },
  { name: '单特类', formula: '[L单特类]特码=2026002' },
  { name: '大小单双类', formula: '[L大小单双类]特码=2026002' },
];

console.log('--- 开始测试各类结果类型计算逻辑 ---');

testCases.forEach(test => {
  const parsed = parseFormula(test.formula);
  if (!parsed) {
    console.error(`FAIL: ${test.name} - 无法解析公式: ${test.formula}`);
    return;
  }

  // 验证 2026002 期。计算应该使用 2026001 期的特码 (16)
  // 16 的属性：
  // 尾数: 6
  // 头数: 1
  // 合数: 1+6=7
  // 波色: 16是绿波 (0=红, 1=蓝, 2=绿) -> 2
  // 五行: 16在马年是木 (0=金, 1=木, 2=水, 3=火, 4=土) -> 1
  // 肖位: 16在马年是兔 (马=7, 蛇=6, 龙=5, 兔=4) -> 4
  // 单特: 16
  // 大小单双: 16是小双 -> 1

  const result = verifyFormula(parsed, mockHistory, undefined, 1, 0, 0, 2026002);
  const periodResult = result.periodResults[0];
  
  console.log(`\n测试类型: ${test.name}`);
  console.log(`公式: ${test.formula}`);
  console.log(`计算值 (来自上一期特码16): ${periodResult.result}`);
  console.log(`本期特码 (7) 的属性值: ${periodResult.targetValue}`);
  console.log(`是否命中: ${periodResult.hit ? 'YES' : 'NO'}`);
});

console.log('\n--- 测试结束 ---');
