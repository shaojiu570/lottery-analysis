import { getNumberAttribute, resultToText } from './src/utils/mappings';

// 历史数据
const historyData = [
  { period: 2026073, numbers: [7,29,1,33,36,14,34], zodiacYear: 7 },
  { period: 2026072, numbers: [12,28,1,42,25,44,46], zodiacYear: 7 },
  { period: 2026071, numbers: [44,30,25,5,41,8,48], zodiacYear: 7 },
  { period: 2026070, numbers: [47,17,23,10,41,7,25], zodiacYear: 7 },
  { period: 2026069, numbers: [23,16,10,34,8,36,24], zodiacYear: 7 },
  { period: 2026068, numbers: [49,2,1,26,38,21,23], zodiacYear: 7 },
  { period: 2026067, numbers: [15,30,6,1,26,9,5], zodiacYear: 7 },
  { period: 2026066, numbers: [24,20,36,44,2,28,37], zodiacYear: 7 },
  { period: 2026065, numbers: [2,45,17,38,33,24,5], zodiacYear: 7 },
  { period: 2026064, numbers: [8,23,40,44,34,2,18], zodiacYear: 7 },
];

// 平2合计算
const digitSum = (n: number) => Math.abs(n).toString().split('').reduce((s, d) => s + parseInt(d), 0);

console.log('===== 用前一期数据预测下一期 =====');
console.log('期数\t\t平2合\t预测\t\t特码\t特肖\t命中?');

for (let i = 1; i < historyData.length; i++) {
  const current = historyData[i];
  const prev = historyData[i-1];
  
  const ping2 = prev.numbers[1];
  const he = digitSum(ping2);
  const predict = getNumberAttribute(he, '肖位类', prev.zodiacYear);
  const predictText = resultToText(predict, '肖位类', prev.zodiacYear);
  
  const teNum = current.numbers[6];
  const teXiaoWei = getNumberAttribute(teNum, '肖位类', current.zodiacYear);
  const teXiaoWeiText = resultToText(teXiaoWei, '肖位类', current.zodiacYear);
  
  const hit = predictText === teXiaoWeiText;
  console.log(`${current.period}\t${he}\t${predictText}\t\t${teNum}\t${teXiaoWeiText}\t${hit?'★':'☆'}`);
}

console.log('\n===== 统计命中 =====');
const stats: boolean[] = [];
for (let i = 1; i < historyData.length; i++) {
  const current = historyData[i];
  const prev = historyData[i-1];
  
  const ping2 = prev.numbers[1];
  const he = digitSum(ping2);
  const predict = getNumberAttribute(he, '肖位类', prev.zodiacYear);
  const predictText = resultToText(predict, '肖位类', prev.zodiacYear);
  
  const teNum = current.numbers[6];
  const teXiaoWei = getNumberAttribute(teNum, '肖位类', current.zodiacYear);
  const teXiaoWeiText = resultToText(teXiaoWei, '肖位类', current.zodiacYear);
  
  stats.push(predictText === teXiaoWeiText);
}

console.log('命中:', stats.map(h => h?'1':'0').join(','));
console.log('总命中:', stats.filter(h=>h).length);