import { getNumberAttribute, resultToText, getZodiacMap, WAVE_COLORS, FIVE_ELEMENTS, BIG_SMALL_ODD_EVEN } from './src/utils/mappings';

const num = 53;

console.log(`========== 号码 ${num} 各结果类型计算 ==========`);

// 假设当前生肖年份为马年（7）
const zodiacYear = 7;

console.log(`当前生肖年份: ${zodiacYear} (马年)`);
console.log('');

// 1. 肖位类
const xiaoWei = getNumberAttribute(num, '肖位类', zodiacYear);
console.log(`肖位类: 值=${xiaoWei}, 结果=${resultToText(xiaoWei, '肖位类', zodiacYear)}`);

// 2. 单特类
const danTe = getNumberAttribute(num, '单特类', zodiacYear);
console.log(`单特类: 值=${danTe}, 结果=${resultToText(danTe, '单特类', zodiacYear)}`);

// 3. 波色类
const boSe = getNumberAttribute(num, '波色类', zodiacYear);
console.log(`波色类: 值=${boSe}, 结果=${resultToText(boSe, '波色类', zodiacYear)}`);

// 4. 五行类
const wuHang = getNumberAttribute(num, '五行类', zodiacYear);
console.log(`五行类: 值=${wuHang}, 结果=${resultToText(wuHang, '五行类', zodiacYear)}`);

// 5. 头数类
const touShu = getNumberAttribute(num, '头数类', zodiacYear);
console.log(`头数类: 值=${touShu}, 结果=${resultToText(touShu, '头数类', zodiacYear)}`);

// 6. 合数类
const heShu = getNumberAttribute(num, '合数类', zodiacYear);
console.log(`合数类: 值=${heShu}, 结果=${resultToText(heShu, '合数类', zodiacYear)}`);

// 7. 尾数类
const weiShu = getNumberAttribute(num, '尾数类', zodiacYear);
console.log(`尾数类: 值=${weiShu}, 结果=${resultToText(weiShu, '尾数类', zodiacYear)}`);

// 8. 大小单双类
const daXiao = getNumberAttribute(num, '大小单双类', zodiacYear);
console.log(`大小单双类: 值=${daXiao}, 结果=${resultToText(daXiao, '大小单双类', zodiacYear)}`);

console.log('');
console.log('========== 详细分解 ==========');
console.log(`号码: ${num}`);
console.log(`十位: ${Math.floor(num / 10)}`);
console.log(`个位: ${num % 10}`);
const digitSum = (n: number) => n.toString().split('').reduce((s, d) => s + parseInt(d), 0);
console.log(`数字和: ${digitSum(num)}`);

// 检查波色
const waveColor = (() => {
  if (WAVE_COLORS.红.includes(num)) return '红波';
  if (WAVE_COLORS.蓝.includes(num)) return '蓝波';
  if (WAVE_COLORS.绿.includes(num)) return '绿波';
  return '未知';
})();
console.log(`波色: ${waveColor}`);

// 检查五行
const fiveElement = (() => {
  for (const [elem, nums] of Object.entries(FIVE_ELEMENTS)) {
    if (nums.includes(num)) return elem;
  }
  return '未知';
})();
console.log(`五行: ${fiveElement}`);

// 检查大小单双
const bse = (() => {
  for (const [label, nums] of Object.entries(BIG_SMALL_ODD_EVEN)) {
    if (nums.includes(num)) return label;
  }
  return '未知';
})();
console.log(`大小单双: ${bse}`);