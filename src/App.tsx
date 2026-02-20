import { useEffect, useCallback, useState, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Header } from '@/components/Header';
import { FormulaInput } from '@/components/FormulaInput';
import { ResultDisplay } from '@/components/ResultDisplay';
import { HistoryModal } from '@/components/HistoryModal';
import { FavoritesModal } from '@/components/FavoritesModal';
import { SmartSearchModal } from '@/components/SmartSearchModal';
import { SettingsModal } from '@/components/SettingsModal';
import { FilterModal } from '@/components/FilterModal';
import { AddToFavoritesModal } from '@/components/AddToFavoritesModal';
import { SavedVerificationsModal } from '@/components/SavedVerificationsModal';
import { parseFormulas, addFormulaNumbers, removeFormulaNumbers, ParseError } from '@/utils/formulaParser';
import { verifyFormulas } from '@/utils/calculator';
import { useWorkerVerify } from '@/hooks/useWorkerVerify';
import { useSearchWorker } from '@/hooks/useSearchWorker';
import { getSavedVerifications, saveVerification, deleteVerification, clearAllSavedVerifications } from '@/utils/storage';
import { SavedVerification } from '@/types';

function App() {
  const {
    formulaInput,
    setFormulaInput,
    verifyResults,
    setVerifyResults,
    historyData,
    loadHistoryData,
    importHistoryData,
    clearAllHistory,
    deleteHistoryItem,
    favoriteGroups,
    loadFavorites,
    addGroup,
    removeGroup,
    addToFavorites,
    removeFromFavorites,
    settings,
    updateSettings,
    isVerifying,
    setIsVerifying,
    showFavorites,
    setShowFavorites,
    showSearch,
    setShowSearch,
    showHistory,
    setShowHistory,
    showSettings,
    setShowSettings,
    latestPeriod,
  } = useAppStore();

  // 筛选状态
  const [showFilter, setShowFilter] = useState(false);
  const [filteredResults, setFilteredResults] = useState<typeof verifyResults>([]);
  const [isUsingFilter, setIsUsingFilter] = useState(false);

  // 收藏到分组状态
  const [showAddToFavorites, setShowAddToFavorites] = useState(false);
  const [formulasToAdd, setFormulasToAdd] = useState<string[]>([]);

  // 解析错误状态
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  
  // 使用 Worker 进行验证
  const workerVerify = useWorkerVerify();
  
  // 使用 Worker 进行智能搜索
  const searchWorker = useSearchWorker();
  const wasSearchingRef = useRef(false);

  // 搜索完成自动弹出结果界面
  useEffect(() => {
    if (wasSearchingRef.current && !searchWorker.isSearching && searchWorker.results.length > 0) {
      setShowSearch(true);
    }
    wasSearchingRef.current = searchWorker.isSearching;
  }, [searchWorker.isSearching, searchWorker.results.length, setShowSearch]);

  // 保存的验证记录
  const [savedVerifications, setSavedVerifications] = useState<SavedVerification[]>([]);
  const [showSavedVerifications, setShowSavedVerifications] = useState(false);

  // 加载保存的验证记录
  useEffect(() => {
    setSavedVerifications(getSavedVerifications());
  }, []);

  useEffect(() => {
    loadHistoryData();
    loadFavorites();
  }, []);

  // 当 Worker 完成时更新结果
  useEffect(() => {
    if (!workerVerify.isVerifying && workerVerify.results.length > 0) {
      setVerifyResults(workerVerify.results);
      setIsVerifying(false);
    }
  }, [workerVerify.isVerifying, workerVerify.results, setVerifyResults, setIsVerifying]);

  // 验证时自动添加编号（使用 Web Worker 避免卡顿）
  const handleVerify = useCallback(async () => {
    if (!formulaInput.trim() || historyData.length === 0) return;

    const { formulas: parsed, errors } = parseFormulas(formulaInput);
    setParseErrors(errors);
    
    if (parsed.length === 0) {
      alert('未找到有效公式，请检查格式');
      return;
    }

    setIsVerifying(true);
    setVerifyResults([]);
    
    // 使用 Web Worker 进行验证
    workerVerify.verify(parsed, historyData, settings.targetPeriod);
  }, [formulaInput, historyData, settings.targetPeriod, workerVerify, setIsVerifying, setVerifyResults, setParseErrors]);

  // 清空结果和输入
  const handleClearResults = useCallback(() => {
    setVerifyResults([]);
    setFormulaInput('');
    setIsUsingFilter(false);
    setFilteredResults([]);
  }, [setVerifyResults, setFormulaInput]);

  // 处理生肖年份变更
  const handleZodiacChange = useCallback((zodiac: number) => {
    updateSettings({ zodiacYear: zodiac });
  }, [updateSettings]);

  // 保存当前验证记录
  const handleSaveVerification = useCallback(() => {
    if (verifyResults.length === 0) return;
    
    const name = prompt('请输入验证记录名称:', `验证记录 ${new Date().toLocaleDateString()}`);
    if (!name) return;

    const newVerification: SavedVerification = {
      id: `v_${Date.now()}`,
      name,
      formulaInput,
      results: verifyResults,
      targetPeriod: settings.targetPeriod,
      zodiacYear: settings.zodiacYear,
      createdAt: Date.now(),
    };

    saveVerification(newVerification);
    setSavedVerifications(getSavedVerifications());
    alert('验证记录已保存！');
  }, [verifyResults, formulaInput, settings.targetPeriod, settings.zodiacYear]);

  // 加载保存的验证记录
  const handleLoadVerification = useCallback((verification: SavedVerification) => {
    setFormulaInput(verification.formulaInput);
    setVerifyResults(verification.results);
    updateSettings({ 
      targetPeriod: verification.targetPeriod,
      zodiacYear: verification.zodiacYear 
    });
    alert(`已加载验证记录：${verification.name}`);
  }, [setFormulaInput, setVerifyResults, updateSettings]);

  // 删除保存的验证记录
  const handleDeleteVerification = useCallback((id: string) => {
    deleteVerification(id);
    setSavedVerifications(getSavedVerifications());
  }, []);

  // 清空所有保存的验证记录
  const handleClearAllVerifications = useCallback(() => {
    clearAllSavedVerifications();
    setSavedVerifications([]);
  }, []);

  const handleCopyResults = useCallback((text?: string) => {
    // 如果传入了完整文本，直接使用；否则只复制第一层
    if (text) {
      navigator.clipboard.writeText(text);
      alert('已复制全部结果到剪贴板');
      return;
    }
    
    if (verifyResults.length === 0) return;
    
    const textContent = verifyResults.map((r, i) => {
      const stars = r.hits.map(h => h ? '★' : '☆').join('');
      return `[${(i + 1).toString().padStart(3, '0')}]${stars}≡${r.totalPeriods}中${r.hitCount}次=${r.results.join(',')}`;
    }).join('\n');
    
    navigator.clipboard.writeText(textContent);
    alert('已复制到剪贴板');
  }, [verifyResults]);

  const handleSaveToFavorites = useCallback(() => {
    const lines = formulaInput.split('\n').filter(l => l.trim());
    if (lines.length === 0) {
      alert('没有可收藏的公式');
      return;
    }
    
    // 移除编号后准备收藏
    const cleanLines = lines.map(line => removeFormulaNumbers(line).trim()).filter(l => l);
    setFormulasToAdd(cleanLines);
    setShowAddToFavorites(true);
  }, [formulaInput]);

  const handleAddFormulasFromSearch = useCallback((formulas: string[]) => {
    const current = formulaInput.trim();
    // 搜索返回的公式添加编号
    const numberedFormulas = addFormulaNumbers(formulas.join('\n'));
    const newInput = current 
      ? current + '\n' + numberedFormulas
      : numberedFormulas;
    setFormulaInput(newInput);
    // 延迟执行验证，确保状态更新完成
      setTimeout(() => {
      // 直接调用验证逻辑
      const { historyData, setIsVerifying, setVerifyResults, settings } = useAppStore.getState();
      if (!newInput.trim() || historyData.length === 0) return;
      setIsVerifying(true);
      try {
        const { formulas: parsed, errors } = parseFormulas(newInput);
        setParseErrors(errors);
        if (parsed.length === 0) {
          return;
        }
        // 使用公式里写的参数进行验证，传入目标期数
        const results = verifyFormulas(
          parsed,
          historyData,
          undefined,
          undefined,
          undefined,
          undefined,
          settings.targetPeriod
        );
        setVerifyResults(results);
      } catch (error) {
        console.error('验证错误:', error);
      } finally {
        setIsVerifying(false);
      }
    }, 200);
  }, [formulaInput, setFormulaInput, settings]);

  // 保存设置时更新原公式
  const handleSaveSettings = useCallback((newSettings: Partial<typeof settings>) => {
    // 如果原公式有内容，提示是否更新
    if (formulaInput.trim()) {
      const update = confirm('是否将新的参数应用到当前公式？');
      if (update) {
        // 重新构建带新参数的公式
        const { formulas: parsed, errors } = parseFormulas(formulaInput);
        setParseErrors(errors);
        const updatedLines = parsed.map(p => {
          const offsetVal = newSettings.offset ?? settings.offset;
          const periodsVal = newSettings.periods ?? settings.periods;
          const leftVal = newSettings.leftExpand ?? settings.leftExpand;
          const rightVal = newSettings.rightExpand ?? settings.rightExpand;
          const offsetStr = offsetVal >= 0 ? `+${offsetVal}` : `${offsetVal}`;
          const leftStr = leftVal > 0 ? `左${leftVal}` : '';
          const rightStr = rightVal > 0 ? `右${rightVal}` : '';
          return `[${p.rule}${p.resultType}]${p.expression}${offsetStr}=${periodsVal}${leftStr}${rightStr}`;
        });
        setFormulaInput(addFormulaNumbers(updatedLines.join('\n')));
      }
    }
    updateSettings(newSettings);
    setShowSettings(false);
  }, [formulaInput, settings, updateSettings, setShowSettings, setFormulaInput]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header 
        onOpenFavorites={() => setShowFavorites(true)}
        onOpenSearch={() => setShowSearch(true)}
        onOpenHistory={() => setShowHistory(true)}
        currentZodiac={settings.zodiacYear}
        onZodiacChange={handleZodiacChange}
        onSaveVerification={handleSaveVerification}
        hasVerificationResults={verifyResults.length > 0}
        onOpenSavedVerifications={() => setShowSavedVerifications(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ResultDisplay 
          results={isUsingFilter ? filteredResults : verifyResults}
          latestPeriod={latestPeriod}
          targetPeriod={settings.targetPeriod}
          historyData={historyData}
          onClear={handleClearResults}
          onCopy={handleCopyResults}
          parseErrors={parseErrors}
          zodiacYear={settings.zodiacYear}
        />

        <FormulaInput
          value={formulaInput}
          onChange={setFormulaInput}
          onVerify={handleVerify}
          onOpenSettings={() => setShowSettings(true)}
          onOpenFilter={() => setShowFilter(true)}
          onSaveToFavorites={handleSaveToFavorites}
          isVerifying={isVerifying}
        />
      </main>

      {/* Modals */}
      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        historyData={historyData}
        onImport={importHistoryData}
        onClear={clearAllHistory}
        onDelete={deleteHistoryItem}
      />

      <FavoritesModal
        isOpen={showFavorites}
        onClose={() => setShowFavorites(false)}
        groups={favoriteGroups}
        onAddGroup={addGroup}
        onDeleteGroup={removeGroup}
        onSelectFormulas={(formulas) => {
          const numberedFormulas = addFormulaNumbers(formulas.join('\n'));
          const newInput = numberedFormulas;
          setFormulaInput(newInput);
          setShowFavorites(false);
          // 延迟执行验证
          setTimeout(() => {
            const { historyData, setIsVerifying, setVerifyResults, settings } = useAppStore.getState();
            if (!newInput.trim() || historyData.length === 0) return;
            setIsVerifying(true);
            try {
              const { formulas: parsed, errors } = parseFormulas(newInput);
              setParseErrors(errors);
              if (parsed.length === 0) return;
              // 使用公式里写的参数进行验证，传入目标期数
              const results = verifyFormulas(
                parsed,
                historyData,
                undefined,
                undefined,
                undefined,
                undefined,
                settings.targetPeriod
              );
              setVerifyResults(results);
            } catch (error) {
              console.error('验证错误:', error);
            } finally {
              setIsVerifying(false);
            }
          }, 200);
        }}
        onRemoveFormula={removeFromFavorites}
      />

      <SmartSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        historyData={historyData}
        settings={settings}
        onAddFormulas={handleAddFormulasFromSearch}
        searchWorker={searchWorker}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onBatchReplace={(find, replace) => {
          const regex = new RegExp(find, 'g');
          setFormulaInput(formulaInput.replace(regex, replace));
        }}
        formulaInput={formulaInput}
      />

      <FilterModal
        isOpen={showFilter}
        onClose={() => setShowFilter(false)}
        results={verifyResults}
        formulaInput={formulaInput}
        onFilter={(filtered) => {
          setFilteredResults(filtered);
          setIsUsingFilter(true);
        }}
        onUpdateFormulas={(newFormulaInput) => {
          setFormulaInput(newFormulaInput);
          setIsUsingFilter(false);
          setFilteredResults([]);
        }}
      />

      <AddToFavoritesModal
        isOpen={showAddToFavorites}
        onClose={() => setShowAddToFavorites(false)}
        groups={favoriteGroups}
        formulas={formulasToAdd}
        onAdd={(groupId, formulas) => {
          formulas.forEach(formula => {
            addToFavorites(groupId, formula);
          });
          const group = favoriteGroups.find(g => g.id === groupId);
          if (group) {
            alert(`已添加 ${formulas.length} 个公式到"${group.name}"分组`);
          }
        }}
      />

      <SavedVerificationsModal
        isOpen={showSavedVerifications}
        onClose={() => setShowSavedVerifications(false)}
        savedVerifications={savedVerifications}
        onLoadVerification={handleLoadVerification}
        onDeleteVerification={handleDeleteVerification}
        onClearAll={handleClearAllVerifications}
      />
    </div>
  );
}

export default App;
