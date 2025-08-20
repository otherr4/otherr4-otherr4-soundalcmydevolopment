import React, { useState, useRef, useEffect } from 'react';
import { Music, Mic, ChevronDown, X } from 'lucide-react';
import { TalentType, TalentTypeGroup } from '../../utils/constants';

interface TalentTypeSelectorProps {
  groups: TalentTypeGroup[];
  selectedTypes: string[];
  onChange: (types: string[]) => void;
  title: string;
  icon: React.ElementType;
}

const TalentTypeSelector: React.FC<TalentTypeSelectorProps> = ({
  groups,
  selectedTypes,
  onChange,
  title,
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTypeToggle = (typeId: string) => {
    const newSelectedTypes = selectedTypes.includes(typeId)
      ? selectedTypes.filter(id => id !== typeId)
      : [...selectedTypes, typeId];
    onChange(newSelectedTypes);
  };

  const removeType = (typeId: string) => {
    onChange(selectedTypes.filter(id => id !== typeId));
  };

  const handleAddCustom = () => {
    if (customInput.trim()) {
      onChange([...selectedTypes, customInput.trim()]);
      setCustomInput('');
      setShowCustomInput(false);
    }
  };

  // Flatten all types for selected display
  const allTypes = groups.flatMap(g => g.types);
  const selectedItems = allTypes.filter(type => selectedTypes.includes(type.id));
  const customSelected = selectedTypes.filter(id => !allTypes.some(type => type.id === id));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected items display */}
      <div
        className="min-h-[42px] p-2 border-2 border-primary-500/30 rounded-lg bg-gray-800/80 cursor-pointer hover:border-primary-500/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {selectedItems.map(type => (
              <span
                key={type.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary-500/30 text-primary-100 rounded-md border border-primary-500/50"
              >
                <span className="text-lg" role="img" aria-label={type.name}>{type.icon}</span>
                {type.name}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeType(type.id); }}
                  className="ml-1 hover:text-primary-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {customSelected.map(custom => (
              <span
                key={custom}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary-500/30 text-primary-100 rounded-md border border-primary-500/50"
              >
                <span className="text-lg" role="img" aria-label="Custom">➕</span>
                {custom}
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeType(custom); }}
                  className="ml-1 hover:text-primary-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {selectedItems.length === 0 && customSelected.length === 0 && (
              <span className="text-gray-300 flex items-center gap-2">
                <Icon className="w-5 h-5 text-primary-400" />
                Select {title.toLowerCase()}
              </span>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 text-primary-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border-2 border-primary-500/30 rounded-lg shadow-xl max-h-[60vh] overflow-y-auto">
          {/* Search input */}
          <div className="p-2 border-b border-primary-500/20">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-700/80 border-2 border-primary-500/20 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          {/* Grouped options list */}
          <div className="max-h-[45vh] overflow-y-auto">
            {groups.map(group => {
              const filtered = group.types.filter(type => type.name.toLowerCase().includes(searchTerm.toLowerCase()));
              if (filtered.length === 0) return null;
              return (
                <div key={group.group} className="py-1">
                  <div className="px-4 py-1 text-xs font-bold text-primary-300 uppercase tracking-wider sticky top-0 bg-gray-800/95 z-10">
                    {group.group}
                  </div>
                  {filtered.map(type => (
                    type.id === 'other' ? (
                      <button
                        key={group.group + '-' + type.id}
                        type="button"
                        onClick={e => { e.preventDefault(); setShowCustomInput(true); }}
                        className="w-full px-4 py-3 text-left hover:bg-primary-500/10 transition-colors border-l-4 border-transparent flex items-center gap-3"
                      >
                        <span className="text-2xl" role="img" aria-label={type.name}>{type.icon}</span>
                        <span className="font-semibold text-primary-100">Other (Type your own)</span>
                      </button>
                    ) : (
                      <button
                        key={group.group + '-' + type.id}
                        type="button"
                        onClick={() => handleTypeToggle(type.id)}
                        className={`w-full px-4 py-3 text-left hover:bg-primary-500/10 transition-colors ${
                          selectedTypes.includes(type.id)
                            ? 'bg-primary-500/20 border-l-4 border-primary-500'
                            : 'border-l-4 border-transparent'
                        } flex items-center gap-3`}
                      >
                        <span className="text-2xl" role="img" aria-label={type.name}>{type.icon}</span>
                        <div>
                          <div className={`font-semibold ${selectedTypes.includes(type.id) ? 'text-primary-100' : 'text-gray-100'}`}>{type.name}</div>
                          {type.description && <div className="text-sm text-gray-400 mt-0.5">{type.description}</div>}
                        </div>
                      </button>
                    )
                  ))}
                </div>
              );
            })}
            {/* Custom input field for 'Other' */}
            {showCustomInput && (
              <div className="px-4 py-3 flex gap-2 items-center bg-gray-900 sticky bottom-0 z-20">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 rounded-md border border-primary-500/40 bg-gray-800 text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500"
                  placeholder={`Type your ${title.toLowerCase()}...`}
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddCustom(); }}
                  autoFocus
                />
                <button
                  type="button"
                  className="px-3 py-2 rounded-md bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors"
                  onClick={handleAddCustom}
                >Add</button>
                <button
                  type="button"
                  className="ml-1 text-gray-400 hover:text-red-400"
                  onClick={() => { setShowCustomInput(false); setCustomInput(''); }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TalentTypeSelector; 