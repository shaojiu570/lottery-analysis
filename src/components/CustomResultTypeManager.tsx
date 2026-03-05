import { useState } from 'react';
import { CustomResultType, CustomResultMappingItem } from '@/types';
import { Trash2, Plus, Edit2 } from 'lucide-react';

interface CustomResultTypeManagerProps {
  types: CustomResultType[];
  onSave: (type: CustomResultType) => void;
  onDelete: (id: string) => void;
}

export function CustomResultTypeManager({ types, onSave, onDelete }: CustomResultTypeManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMappings, setEditMappings] = useState<CustomResultMappingItem[]>([]);

  const handleStartAdd = () => {
    setEditName('');
    setEditMappings([]);
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (type: CustomResultType) => {
    setEditName(type.name);
    setEditMappings(type.mappings.map(m => ({ ...m })));
    setEditingId(type.id);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAddMapping = () => {
    setEditMappings([...editMappings, { label: '', values: [] }]);
  };

  const handleRemoveMapping = (index: number) => {
    setEditMappings(editMappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (index: number, label: string, valuesStr: string) => {
    const values = valuesStr.split(/[,，\s]+/).map(v => parseInt(v)).filter(v => !isNaN(v));
    const newMappings = [...editMappings];
    newMappings[index] = { label, values };
    setEditMappings(newMappings);
  };

  const handleSave = () => {
    if (!editName.trim() || editMappings.length === 0) return;
    onSave({
      id: editingId || `rt_${Date.now()}`,
      name: editName.trim(),
      mappings: editMappings.filter(m => m.label.trim() && m.values.length > 0)
    });
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700">自定义结果类型列表</h3>
        {!isAdding && !editingId && (
          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
          >
            <Plus size={12} /> 新增类型
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-3">
          <input
            type="text"
            placeholder="类型名称 (如: 季节类)"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
          />
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            <p className="text-[10px] text-gray-400">映射规则：标签 -> 命中数值列表 (用逗号隔开)</p>
            {editMappings.map((m, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  type="text"
                  placeholder="标签 (春)"
                  value={m.label}
                  onChange={e => handleMappingChange(i, e.target.value, m.values.join(','))}
                  className="w-20 px-2 py-1 text-xs border border-gray-200 rounded outline-none"
                />
                <input
                  type="text"
                  placeholder="数值 (1,2,3)"
                  value={m.values.join(',')}
                  onChange={e => handleMappingChange(i, m.label, e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded outline-none"
                />
                <button onClick={() => handleRemoveMapping(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={12} /></button>
              </div>
            ))}
            <button
              onClick={handleAddMapping}
              className="w-full py-1.5 text-[10px] text-emerald-600 border border-dashed border-emerald-300 rounded hover:bg-emerald-100 flex items-center justify-center gap-1"
            >
              <Plus size={10} /> 添加映射行
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={handleCancel} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded">取消</button>
            <button onClick={handleSave} className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">保存</button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {types.length === 0 && !isAdding && (
          <p className="text-center text-xs text-gray-400 py-4">暂无自定义结果类型</p>
        )}
        {types.map(t => (
          <div key={t.id} className="p-2 bg-gray-50 rounded border border-gray-200 hover:border-emerald-200 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold text-gray-700">{t.name}</div>
              <div className="flex gap-1">
                <button onClick={() => handleStartEdit(t)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
                <button onClick={() => onDelete(t.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {t.mappings.slice(0, 3).map((m, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-white text-[10px] text-gray-500 rounded border border-gray-200">
                  {m.label}: {m.values.length}码
                </span>
              ))}
              {t.mappings.length > 3 && <span className="text-[10px] text-gray-400">...</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
