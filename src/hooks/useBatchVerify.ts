import { useState, useCallback, useRef } from 'react';
import { VerifyResult, LotteryData } from '@/types';
import { ParsedFormula } from '@/utils/formulaParser';
import { verifyFormulas } from '@/utils/calculator';

interface UseBatchVerifyReturn {
  results: VerifyResult[];
  isVerifying: boolean;
  progress: { current: number; total: number } | null;
  verify: (
    formulas: ParsedFormula[],
    historyData: LotteryData[],
    targetPeriod: number | null,
    onComplete?: () => void
  ) => void;
  reset: () => void;
}

const BATCH_SIZE = 50; // 每批验证50个公式
const BATCH_DELAY = 10; // 每批之间间隔10ms

export function useBatchVerify(): UseBatchVerifyReturn {
  const [results, setResults] = useState<VerifyResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const abortRef = useRef(false);

  const verify = useCallback((
    formulas: ParsedFormula[],
    historyData: LotteryData[],
    targetPeriod: number | null,
    onComplete?: () => void
  ) => {
    if (formulas.length === 0) return;

    abortRef.current = false;
    setIsVerifying(true);
    setResults([]);
    setProgress({ current: 0, total: formulas.length });

    const allResults: VerifyResult[] = [];
    let currentIndex = 0;

    const processBatch = () => {
      if (abortRef.current) {
        setIsVerifying(false);
        return;
      }

      const batch = formulas.slice(currentIndex, currentIndex + BATCH_SIZE);
      
      if (batch.length === 0) {
        // 完成
        setResults(allResults);
        setIsVerifying(false);
        setProgress(null);
        onComplete?.();
        return;
      }

      // 验证当前批次
      const batchResults = verifyFormulas(
        batch,
        historyData,
        undefined,
        undefined,
        undefined,
        undefined,
        targetPeriod
      );

      allResults.push(...batchResults);
      currentIndex += batch.length;

      // 更新进度
      setProgress({ current: currentIndex, total: formulas.length });
      
      // 每5批更新一次结果（避免频繁渲染）
      if (currentIndex % (BATCH_SIZE * 5) === 0 || currentIndex >= formulas.length) {
        setResults([...allResults]);
      }

      // 继续下一批
      if (currentIndex < formulas.length) {
        setTimeout(processBatch, BATCH_DELAY);
      } else {
        // 完成
        setResults(allResults);
        setIsVerifying(false);
        setProgress(null);
        onComplete?.();
      }
    };

    // 开始处理
    processBatch();
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setResults([]);
    setIsVerifying(false);
    setProgress(null);
  }, []);

  return {
    results,
    isVerifying,
    progress,
    verify,
    reset,
  };
}
