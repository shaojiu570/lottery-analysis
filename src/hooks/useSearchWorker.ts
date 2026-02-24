import { useEffect, useRef, useState, useCallback } from 'react';
import type { LotteryData, ResultType, SearchStrategy } from '@/types';

export interface SearchResult {
  formula: string;
  hitRate: number;
  hitCount: number;
  totalPeriods: number;
}

interface UseSearchWorkerReturn {
  results: SearchResult[];
  intermediateResults: SearchResult[];
  isSearching: boolean;
  progress: { current: number; total: number; found: number } | null;
  search: (
    historyData: LotteryData[],
    targetHitRate: number,
    maxCount: number,
    strategy: SearchStrategy,
    resultTypes: ResultType[],
    offset: number,
    periods: number,
    leftExpand: number,
    rightExpand: number
  ) => void;
  cancel: () => void;
  clearResults: () => void;
}

export function useSearchWorker(): UseSearchWorkerReturn {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [intermediateResults, setIntermediateResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; found: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // 创建worker的函数
  const createWorker = useCallback(() => {
    const worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (event) => {
      const { type, results: searchResults, current, total, found, error } = event.data;
      
      if (type === 'progress') {
        setProgress({ current, total, found });
        // 保存中间结果
        if (searchResults && searchResults.length > 0) {
          setIntermediateResults(searchResults);
        }
      } else if (type === 'complete') {
        setResults(searchResults);
        setIntermediateResults([]);
        setIsSearching(false);
        setProgress(null);
        workerRef.current = null;
      } else if (type === 'error') {
        console.error('Search worker error:', error);
        setIsSearching(false);
        setProgress(null);
        workerRef.current = null;
      }
    };

    worker.onerror = (error) => {
      console.error('Search worker error:', error);
      setIsSearching(false);
      setProgress(null);
      workerRef.current = null;
    };

    return worker;
  }, []);

  useEffect(() => {
    workerRef.current = createWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [createWorker]);

  const search = useCallback((
    historyData: LotteryData[],
    targetHitRate: number,
    maxCount: number,
    strategy: SearchStrategy,
    resultTypes: ResultType[],
    offset: number,
    periods: number,
    leftExpand: number,
    rightExpand: number
  ) => {
    if (historyData.length === 0 || resultTypes.length === 0) return;

    // 如果有旧的worker在运行，先终止它
    if (workerRef.current) {
      workerRef.current.terminate();
    }
    
    // 创建新的worker
    workerRef.current = createWorker();

    setIsSearching(true);
    setResults([]);
    setIntermediateResults([]);
    setProgress({ current: 0, total: 0, found: 0 });

    workerRef.current.postMessage({
      type: 'search',
      historyData,
      targetHitRate,
      maxCount,
      strategy,
      resultTypes,
      offset,
      periods,
      leftExpand,
      rightExpand
    });
  }, [createWorker]);

  const cancel = useCallback(() => {
    // 不立即终止worker，让它继续运行直到完成
    // 这样已找到的结果会在搜索完成后自动显示
    setIsSearching(false);
    setProgress(null);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setIntermediateResults([]);
  }, []);

  return {
    results,
    intermediateResults,
    isSearching,
    progress,
    search,
    cancel,
    clearResults
  };
}
