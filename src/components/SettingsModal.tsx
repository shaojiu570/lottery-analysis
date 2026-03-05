import { useState, useEffect } from 'react';
import { Settings, AliasMapping, CustomElement, CustomResultType } from '@/types';
import { AliasManager } from './AliasManager';
import { CustomElementManager } from './CustomElementManager';
import { CustomResultTypeManager } from './CustomResultTypeManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  aliases: AliasMapping;
  customElements: CustomElement[];
  customResultTypes: CustomResultType[];
  onSave: (settings: Partial<Settings>) => void;
  onUpdateAlias: (standardName: string, aliases: string[]) => void;
  onSaveCustomElement: (element: CustomElement) => void;
  onDeleteCustomElement: (id: string) => void;
  onSaveCustomResultType: (type: CustomResultType) => void;
  onDeleteCustomResultType: (id: string) => void;
  onBatchReplace?: (find: string, replace: string) => void;
  formulaInput?: string;
}

const BUILTIN_RESULT_TYPES = ['尾数类', '头数类', '合数类', '波色类', '五行类', '肖位类', '单特类', '大小单双类'];

export function SettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  aliases,
  customElements,
  customResultTypes,
  onSave, 
  onUpdateAlias,
  onSaveCustomElement,
  onDeleteCustomElement,
  onSaveCustomResultType,
  onDeleteCustomResultType,
  onBatchReplace, 
  formulaInput 
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState('params');
  const [offsetInput, setOffsetInput] = useState(settings.offset.toString());
  const [periodsInput, setPeriodsInput] = useState(settings.periods.toString());
  const [leftExpandInput, setLeftExpandInput] = useState(settings.leftExpand.toString());
  const [rightExpandInput, setRightExpandInput] = useState(settings.rightExpand.toString());
  const [targetPeriodInput, setTargetPeriodInput] = useState(
    settings.targetPeriod?.toString() || ''
  );
  
  const [replaceRule, setReplaceRule] = useState<'D' | 'L' | ''>('L');
  const [replaceType, setReplaceType] = useState<string>('肖位类');
  const [replaceCount, setReplaceCount] = useState(0);

  const allResultTypes = [...BUILTIN_RESULT_TYPES, ...customResultTypes.map(t => t.name)];
  
  // 标记哪个按钮触发的保存，避免不必要的状态重置
  let isApplyingTargetPeriod = false;

  useEffect(() => {
    setOffsetInput(settings.offset.toString());
    setPeriodsInput(settings.periods.toString());
    setLeftExpandInput(settings.leftExpand.toString());
    setRightExpandInput(settings.rightExpand.toString());
    setTargetPeriodInput(settings.targetPeriod?.toString() || '');
    setReplaceCount(0);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSaveParams = () => {
    const offset = offsetInput === '' ? 0 : parseInt(offsetInput) || 0;
    const periods = periodsInput === '' ? 15 : parseInt(periodsInput) || 15;
    const leftExpand = leftExpandInput === '' ? 0 : parseInt(leftExpandInput) || 0;
    const rightExpand = rightExpandInput === '' ? 0 : parseInt(rightExpandInput) || 0;
    
    onSave({ offset, periods, leftExpand, rightExpand, targetPeriod: settings.targetPeriod });
  };

  const handleApplyTargetPeriod = () => {
    const targetPeriod = targetPeriodInput === '' ? null : parseInt(targetPeriodInput) || null;
    onSave({ targetPeriod });
    // 不关闭弹窗，让用户可以继续操作
  };

  const handleInputChange = (value: string, setter: (val: string) => void, allowNegative = false) => {
    if (value === '' || value === '-') {
      setter(value);
      return;
    }
    
    if (allowNegative && value.startsWith('-')) {
      const numPart = value.slice(1);
      if (numPart === '' || /^\d*$/.test(numPart)) {
        setter(value);
      }
      return;
    }
    
    if (/^\d*$/.test(value)) {
      setter(value);
    }
  };

  const handleBatchReplace = () => {
    if (!onBatchReplace || !formulaInput) return;
    
    let findPattern: RegExp;
    let replaceStr: string;
    
    if (replaceRule === '') {
      // 不限：只替换类型部分，保留原规则D或L
      // 例如：[L五行类] -> [L肖位类]，保留L
      findPattern = /\[([DL])([^[\]]+)\]/g;
      replaceStr = `[$1${replaceType}]`;
    } else {
      findPattern = /\[[DL][^\]]+\]/g;
      replaceStr = `[${replaceRule}${replaceType}]`;
    }
    
    const matches = formulaInput.match(findPattern) || [];
    
    if (matches.length > 0) {
      onBatchReplace(findPattern.source, replaceStr);
      setReplaceCount(matches.length);
    }
  };

  const renderParamsTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
        <span>补偿:{offsetInput || '0'} 期:{periodsInput || '15'} 左:{leftExpandInput || '0'} 右:{rightExpandInput || '0'}</span>
        <button
          onClick={() => { handleSaveParams(); onClose(); }}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          保存参数
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <div>
          <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">补偿</label>
          <input
            type="text"
            inputMode="numeric"
            value={offsetInput}
            onChange={(e) => handleInputChange(e.target.value, setOffsetInput, true)}
            className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
          />
        </div>
        <div>
          <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">期数</label>
          <input
            type="text"
            inputMode="numeric"
            value={periodsInput}
            onChange={(e) => handleInputChange(e.target.value, setPeriodsInput, false)}
            className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
          />
        </div>
        <div>
          <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">左扩</label>
          <input
            type="text"
            inputMode="numeric"
            value={leftExpandInput}
            onChange={(e) => handleInputChange(e.target.value, setLeftExpandInput, false)}
            className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
          />
        </div>
        <div>
          <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">右扩</label>
          <input
            type="text"
            inputMode="numeric"
            value={rightExpandInput}
            onChange={(e) => handleInputChange(e.target.value, setRightExpandInput, false)}
            className="w-full px-1 sm:px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">
          目标期数 <span className="text-gray-400">(留空验证最新期)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={targetPeriodInput}
            onChange={(e) => handleInputChange(e.target.value, setTargetPeriodInput, false)}
            placeholder="例如: 2026042"
            className="flex-1 px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
          />
          <button
            onClick={() => { handleApplyTargetPeriod(); onClose(); }}
            className="px-3 py-1 text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
          >
            应用
          </button>
        </div>
      </div>

      {onBatchReplace && (
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">📝 批量替换公式类型</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">替换为:</span>
            <select
              value={replaceRule}
              onChange={(e) => setReplaceRule(e.target.value as 'D' | 'L' | '')}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
            >
              <option value="">不限</option>
              <option value="D">D</option>
              <option value="L">L</option>
            </select>
            <select
              value={replaceType}
              onChange={(e) => setReplaceType(e.target.value)}
              className="px-2 py-1 text-xs border border-gray-300 rounded flex-1 min-w-0"
            >
              {allResultTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button
              onClick={handleBatchReplace}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              替换
            </button>
          </div>
          {replaceCount > 0 && (
            <p className="text-xs text-emerald-600 mt-2">✓ 已替换 {replaceCount} 处</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-base sm:text-lg">⚙️ 设置</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-70 w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex px-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button 
              onClick={() => setActiveTab('params')} 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'params' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>
              验证参数
            </button>
            <button 
              onClick={() => setActiveTab('aliases')} 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'aliases' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>
              别名管理
            </button>
            <button 
              onClick={() => setActiveTab('elements')} 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'elements' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>
              自定义元素
            </button>
            <button 
              onClick={() => setActiveTab('resultTypes')} 
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'resultTypes' ? 'border-b-2 border-emerald-500 text-emerald-600' : 'text-gray-500'}`}>
              结果类型
            </button>
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'params' && renderParamsTab()}
          {activeTab === 'aliases' && <AliasManager aliases={aliases} onUpdate={onUpdateAlias} />}
          {activeTab === 'elements' && (
            <CustomElementManager 
              elements={customElements} 
              onSave={onSaveCustomElement} 
              onDelete={onDeleteCustomElement} 
            />
          )}
          {activeTab === 'resultTypes' && (
            <CustomResultTypeManager 
              types={customResultTypes} 
              onSave={onSaveCustomResultType} 
              onDelete={onDeleteCustomResultType} 
            />
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 text-sm"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
