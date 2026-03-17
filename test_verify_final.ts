// 历史数据
const historyData = [
  { period: 2026073, numbers: [7,29,1,33,36,14,34], zodiacYear: 7 },  // 特码=34, 肖位类=鼠
  { period: 2026072, numbers: [12,28,1,42,25,44,46], zodiacYear: 7 },  // 特码=46, 肖位类=狗
  { period: 2026071, numbers: [44,30,25,5,41,8,48], zodiacYear: 7 },   // 特码=48, 肖位类=虎
  { period: 2026070, numbers: [47,17,23,10,41,7,25], zodiacYear: 7 },  // 特码=25, 肖位类=虎
  { period: 2026069, numbers: [23,16,10,34,8,36,24], zodiacYear: 7 },  // 特码=24, 肖位类=鼠
  { period: 2026068, numbers: [49,2,1,26,38,21,23], zodiacYear: 7 },  // 特码=23, 肖位类=猪
  { period: 2026067, numbers: [15,30,6,1,26,9,5], zodiacYear: 7 },    // 特码=5, 肖位类=龙
  { period: 2026066, numbers: [24,20,36,44,2,28,37], zodiacYear: 7 },  // 特码=37, 肖位类=鸡
  { period: 2026065, numbers: [2,45,17,38,33,24,5], zodiacYear: 7 },     // 特码=5, 肖位类=龙
  { period: 2026064, numbers: [8,23,40,44,34,2,18], zodiacYear: 7 },   // 特码=18, 肖位类=鸡
];

// 计算平2合
const digitSum = n => Math.abs(n).toString().split('').reduce((s, d) => s + parseInt(d), 0);
const zodiacNames = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];

console.log('===== 预测2026074的计算（用2026073数据）=====');
const ping2_073 = 29;
const he_073 = digitSum(ping2_073);
const result_073 = he_073 % 12;
console.log(`2026073: 平2=${ping2_073}, 合=${he_073}, ${he_073}%12=${result_073} → ${zodiacNames[result_073]}`);

console.log('\n===== 用前一期数据预测下一期 =====');
console.log('期数\t\t平2合%12\t预测生肖\t特码\t特码生肖\t命中?');

// 从2026064开始，用2026063的数据预测（但我们没有2026063，所以从2026064开始）
for (let i = 1; i < historyData.length; i++) {
  const current = historyData[i];
  const prev = historyData[i-1];
  
  const ping2 = prev.numbers[1];
  const he = digitSum(ping2);
  const predict = he % 12;
  const predictZodiac = zodiacNames[predict];
  
  const teNum = current.numbers[6];
  const teZodiac = (teNum - 1) % 12;
  const teZodiacName = zodiacNames[teZodiac];
  
  const hit = predict === teZodiac;
  console.log(`${current.period}\t${he}%12=${predict}\t${predictZodiac}\t\t${teNum}\t${teZodiacName}\t\t${hit?'★':'☆'}`);
}

console.log('\n===== 统计命中（用2026064-2026073的数据预测2026065-2026074）=====');
// 预测范围：2026064 ~ 2026073 用前一期数据预测
// 2026065用2026064数据, 2026066用2026065数据, ...
const stats = [];
for (let i = 1; i < historyData.length; i++) {
  const current = historyData[i];
  const prev = historyData[i-1];
  
  const ping2 = prev.numbers[1];
  const he = digitSum(ping2);
  const predict = he % 12;
  
  const teNum = current.numbers[6];
  const teZodiac = (teNum - 1) % 12;
  
  const hit = predict === teZodiac;
  stats.push(hit ? 1 : 0);
}

console.log('命中统计:', stats.join(','));
console.log('总命中:', stats.filter(x=>x).length);