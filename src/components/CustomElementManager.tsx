import { useState } from 'react';
import { CustomElement } from '@/types';
import { Trash2, Plus, Edit2 } from 'lucide-react';

interface CustomElementManagerProps {
  elements: CustomElement[];
  onSave: (element: CustomElement) => void;
  onDelete: (id: string) => void;
}

export function CustomElementManager({ elements, onSave, onDelete }: CustomElementManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editExpression, setEditExpression] = useState('');

  const handleStartAdd = () => {
    setEditName('');
    setEditExpression('');
    setIsAdding(true);
    setEditingId(null);
  };

  const handleStartEdit = (element: CustomElement) => {
    setEditName(element.name);
    setEditExpression(element.expression);
    setEditingId(element.id);
    setIsAdding(false);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!editName.trim() || !editExpression.trim()) return;
    onSave({
      id: editingId || `ce_${Date.now()}`,
      name: editName.trim(),
      expression: editExpression.trim()
    });
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700">自定义元素列表</h3>
        {!isAdding && !editingId && (
          <button
            onClick={handleStartAdd}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
          >
            <Plus size={12} /> 新增元素
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 space-y-3">
          <div className="grid grid-cols-1 gap-2">
            <input
              type="text"
              placeholder="元素名称 (如: 前三总合)"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            <textarea
              placeholder="逻辑表达式 (如: 平1号+平2号+平3号)"
              value={editExpression}
              onChange={e => setEditExpression(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500 outline-none h-16 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={handleCancel} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 rounded">取消</button>
            <button onClick={handleSave} className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700">保存</button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {elements.length === 0 && !isAdding && (
          <p className="text-center text-xs text-gray-400 py-4">暂无自定义元素</p>
        )}
        {elements.map(el => (
          <div key={el.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 hover:border-emerald-200 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-gray-700">{el.name}</div>
              <div className="text-[10px] text-gray-500 truncate">{el.expression}</div>
            </div>
            <div className="flex gap-1 ml-2">
              <button onClick={() => handleStartEdit(el)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={12} /></button>
              <button onClick={() => onDelete(el.id)} className="p-1 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
