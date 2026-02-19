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
  const [isSearching, setIsSearching] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; found: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (event) => {
      const { type, results: searchResults, current, total, found, error } = event.data;
      
      if (type === 'progress') {
        setProgress({ current, total, found });
      } else if (type === 'complete') {
        setResults(searchResults);
        setIsSearching(false);
        setProgress(null);
      } else if (type === 'error') {
        console.error('Search worker error:', error);
        setIsSearching(false);
        setProgress(null);
      }
    };

    worker.onerror = (error) => {
      console.error('Search worker error:', error);
      setIsSearching(false);
      setProgress(null);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, []);

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
    if (!workerRef.current || historyData.length === 0 || resultTypes.length === 0) return;

    setIsSearching(true);
    setResults([]);
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
  }, []);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      const worker = new Worker(new URL('../workers/search.worker.ts', import.meta.url), {
        type: 'module'
      });
      workerRef.current = worker;
    }
    setIsSearching(false);
    setProgress(null);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    isSearching,
    progress,
    search,
    cancel,
    clearResults
  };
}
