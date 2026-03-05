import { useState, useEffect } from 'react';
import { AliasMapping } from '@/types';
import { ELEMENT_DEFINITIONS } from '@/utils/elements';

interface AliasManagerProps {
  aliases: AliasMapping;
  onUpdate: (standardName: string, aliases: string[]) => void;
}

export function AliasManager({ aliases, onUpdate }: AliasManagerProps) {
  const [localAliases, setLocalAliases] = useState<AliasMapping>({});

  useEffect(() => {
    setLocalAliases(aliases);
  }, [aliases]);

  const handleAliasChange = (standardName: string, value: string) => {
    const aliasList = value.split(',').map(a => a.trim()).filter(a => a);
    onUpdate(standardName, aliasList);
  };

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
      {ELEMENT_DEFINITIONS.map(standardName => (
        <div key={standardName} className="grid grid-cols-3 items-center gap-2">
          <label className="text-xs font-medium text-gray-600 truncate col-span-1">
            {standardName}
          </label>
          <input
            type="text"
            value={(localAliases[standardName] || []).join(', ')}
            onChange={(e) => {
              const newLocal = { ...localAliases, [standardName]: e.target.value.split(',').map(a => a.trim()) };
              setLocalAliases(newLocal);
            }}
            onBlur={(e) => handleAliasChange(standardName, e.target.value)}
            placeholder="添加别名,用逗号隔开"
            className="col-span-2 w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      ))}
    </div>
  );
}
