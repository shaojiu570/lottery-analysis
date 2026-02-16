import { useEffect, useRef, useState, useCallback } from 'react';
import type { VerifyResult, LotteryData } from '@/types';
import type { ParsedFormula } from '@/utils/formulaParser';

interface UseWorkerVerifyReturn {
  results: VerifyResult[];
  isVerifying: boolean;
  progress: { current: number; total: number } | null;
  verify: (
    formulas: ParsedFormula[],
    historyData: LotteryData[],
    targetPeriod: number | null
  ) => void;
  cancel: () => void;
}

export function useWorkerVerify(): UseWorkerVerifyReturn {
  const [results, setResults] = useState<VerifyResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // 初始化Worker
  useEffect(() => {
    const worker = new Worker(new URL('../workers/verify.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (event) => {
      const { type, results, current, total, error } = event.data;
      
      if (type === 'progress') {
        setProgress({ current, total });
      } else if (type === 'complete') {
        setResults(results);
        setIsVerifying(false);
        setProgress(null);
      } else if (type === 'error') {
        console.error('Worker error:', error);
        setIsVerifying(false);
        setProgress(null);
      }
    };

    worker.onerror = (error) => {
      console.error('Worker error:', error);
      setIsVerifying(false);
      setProgress(null);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

  const verify = useCallback((
    formulas: ParsedFormula[],
    historyData: LotteryData[],
    targetPeriod: number | null
  ) => {
    if (!workerRef.current || formulas.length === 0) return;

    setIsVerifying(true);
    setResults([]);
    setProgress({ current: 0, total: formulas.length });

    workerRef.current.postMessage({
      type: 'verify',
      formulas,
      historyData,
      targetPeriod
    });
  }, []);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      // 重新创建worker
      const worker = new Worker(new URL('../workers/verify.worker.ts', import.meta.url), {
        type: 'module'
      });
      workerRef.current = worker;
    }
    setIsVerifying(false);
    setProgress(null);
  }, []);

  return {
    results,
    isVerifying,
    progress,
    verify,
    cancel
  };
}
