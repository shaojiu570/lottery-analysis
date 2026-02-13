import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Header } from '@/components/Header';
import { FormulaInput } from '@/components/FormulaInput';
import { ResultDisplay } from '@/components/ResultDisplay';
import { HistoryModal } from '@/components/HistoryModal';
import { FavoritesModal } from '@/components/FavoritesModal';
import { SmartSearchModal } from '@/components/SmartSearchModal';
import { SettingsModal } from '@/components/SettingsModal';
import { parseFormulas, addFormulaNumbers, removeFormulaNumbers } from '@/utils/formulaParser';
import { verifyFormulas } from '@/utils/calculator';

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

  useEffect(() => {
    loadHistoryData();
    loadFavorites();
  }, []);

  // 验证时自动添加编号
  const handleVerify = useCallback(async () => {
    if (!formulaInput.trim() || historyData.length === 0) return;

    setIsVerifying(true);
    
    try {
      const parsed = parseFormulas(formulaInput);
      if (parsed.length === 0) {
        alert('未找到有效公式，请检查格式');
        return;
      }

      const results = verifyFormulas(
        parsed,
        historyData,
        settings.offset,
        settings.periods,
        settings.leftExpand,
        settings.rightExpand
      );
      
      setVerifyResults(results);
    } catch (error) {
      console.error('验证错误:', error);
      alert('验证失败，请检查公式格式');
    } finally {
      setIsVerifying(false);
    }
  }, [formulaInput, historyData, settings, setIsVerifying, setVerifyResults]);

  // 清空结果和输入
  const handleClearResults = useCallback(() => {
    setVerifyResults([]);
    setFormulaInput('');
  }, [setVerifyResults, setFormulaInput]);

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
    
    // 移除编号后收藏
    const cleanLines = lines.map(line => removeFormulaNumbers(line).trim()).filter(l => l);
    const defaultGroup = favoriteGroups[0];
    if (defaultGroup) {
      cleanLines.forEach(line => {
        addToFavorites(defaultGroup.id, line);
      });
      alert(`已添加 ${cleanLines.length} 个公式到"${defaultGroup.name}"分组`);
    }
  }, [formulaInput, favoriteGroups, addToFavorites]);

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
      const { settings, historyData, setIsVerifying, setVerifyResults } = useAppStore.getState();
      if (!newInput.trim() || historyData.length === 0) return;
      setIsVerifying(true);
      try {
        const parsed = parseFormulas(newInput);
        if (parsed.length === 0) {
          return;
        }
        const results = verifyFormulas(
          parsed,
          historyData,
          settings.offset,
          settings.periods,
          settings.leftExpand,
          settings.rightExpand
        );
        setVerifyResults(results);
      } catch (error) {
        console.error('验证错误:', error);
      } finally {
        setIsVerifying(false);
      }
    }, 200);
  }, [formulaInput, setFormulaInput]);

  // 保存设置时更新原公式
  const handleSaveSettings = useCallback((newSettings: Partial<typeof settings>) => {
    // 如果原公式有内容，提示是否更新
    if (formulaInput.trim()) {
      const update = confirm('是否将新的参数应用到当前公式？');
      if (update) {
        // 重新构建带新参数的公式
        const parsed = parseFormulas(formulaInput);
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
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <ResultDisplay 
          results={verifyResults}
          latestPeriod={latestPeriod}
          onClear={handleClearResults}
          onCopy={handleCopyResults}
        />

        <FormulaInput
          value={formulaInput}
          onChange={setFormulaInput}
          onVerify={handleVerify}
          onOpenSettings={() => setShowSettings(true)}
          onOpenFilter={() => {}}
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
          setFormulaInput(numberedFormulas);
          setShowFavorites(false);
          // 自动验证
          setTimeout(() => {
            handleVerify();
          }, 100);
        }}
        onRemoveFormula={removeFromFavorites}
      />

      <SmartSearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        historyData={historyData}
        settings={settings}
        onAddFormulas={handleAddFormulasFromSearch}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
