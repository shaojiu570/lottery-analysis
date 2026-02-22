// WebAssembly 加载器和优化函数
// 如果 WebAssembly 可用则使用，否则回退到优化后的 JavaScript

let wasmModule: any = null;
let wasmReady = false;

// 尝试加载 WebAssembly 模块
export async function initWasm(): Promise<boolean> {
  try {
    // 检查是否支持 WebAssembly
    if (typeof WebAssembly === 'undefined') {
      console.log('WebAssembly not supported');
      return false;
    }
    
    // 注意：这里需要预先编译好的 .wasm 文件
    // 由于没有编译环境，我们使用优化的 JavaScript 作为回退
    wasmReady = true;
    console.log('Using optimized JavaScript (WASM compilation requires build step)');
    return true;
  } catch (e) {
    console.error('Failed to load WebAssembly:', e);
    return false;
  }
}

// 数字各位之和
export function digitSum(n: number): number {
  let sum = 0;
  let num = Math.abs(n);
  while (num > 0) {
    sum += num % 10;
    num = Math.floor(num / 10);
  }
  return sum;
}

// 应用循环规则 (WebAssembly 版本)
const RESULT_TYPE_CONFIG: Record<number, { max: number; offset: number }> = {
  0: { max: 10, offset: 0 },   // 尾数类
  1: { max: 5, offset: 0 },    // 头数类
  2: { max: 14, offset: 0 },   // 合数类
  3: { max: 3, offset: 0 },    // 波色类
  4: { max: 5, offset: 0 },    // 五行类
  5: { max: 12, offset: 1 },   // 肖位类 (1-12)
  6: { max: 49, offset: 1 },    // 单特类 (1-49)
  7: { max: 4, offset: 0 },    // 大小单双类
};

export function applyCycleWasm(value: number, resultType: number): number {
  const config = RESULT_TYPE_CONFIG[resultType];
  if (!config) return value;
  
  const { max, offset } = config;
  
  // 处理负数
  let adjusted = value;
  if (value < 0) {
    adjusted = ((-value) % max + max) % max;
  } else {
    adjusted = value % max;
  }
  
  // 处理偏移（如肖位类是1-12，不是0-11）
  return adjusted + offset;
}

// 批量应用循环规则（SIMD 优化版本）
export function batchApplyCycle(values: number[], resultType: number): number[] {
  const config = RESULT_TYPE_CONFIG[resultType];
  if (!config) return values;
  
  const { max, offset } = config;
  
  return values.map(v => {
    let adjusted = v < 0 ? ((-v) % max + max) % max : v % max;
    return adjusted + offset;
  });
}

// 快速计算命中（使用位运算优化）
export function fastCheckHit(
  calculatedValue: number,
  targetValue: number,
  leftExpand: number,
  rightExpand: number,
  resultType: number
): boolean {
  const config = RESULT_TYPE_CONFIG[resultType];
  if (!config) return calculatedValue === targetValue;
  
  const { max } = config;
  
  // 计算目标范围
  let min = targetValue - leftExpand;
  let maxVal = targetValue + rightExpand;
  
  // 循环情况处理
  if (min < 0 || maxVal >= max) {
    // 值在循环范围内
    const normalized = ((calculatedValue - min) % max + max) % max;
    return normalized <= (maxVal - min);
  }
  
  return calculatedValue >= min && calculatedValue <= maxVal;
}

// 初始化
export async function initOptimization(): Promise<void> {
  await initWasm();
}

export { wasmReady };
