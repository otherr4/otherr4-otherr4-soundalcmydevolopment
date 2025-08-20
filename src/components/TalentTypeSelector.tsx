import React, { useState, useRef, useEffect } from 'react';
import { Music, Mic, ChevronDown, X } from 'lucide-react';

interface TalentType {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

interface TalentTypeSelectorProps {
  types: TalentType[];
  selectedTypes: string[];
  onChange: (types: string[]) => void;
  title: string;
  icon: React.ElementType;
}

const TalentTypeSelector: React.FC<TalentTypeSelectorProps> = ({
  types,
  selectedTypes,
  onChange,
  title,
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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

  const filteredTypes = types.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedItems = types.filter(type => selectedTypes.includes(type.id));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected items display */}
      <div 
        className="min-h-[42px] p-2 border-2 border-primary-500/30 rounded-lg bg-gray-800/80 cursor-pointer hover:border-primary-500/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {selectedItems.length > 0 ? (
              selectedItems.map(type => (
                <span
                  key={type.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-primary-500/30 text-primary-100 rounded-md border border-primary-500/50"
                >
                  <span className="text-lg" role="img" aria-label={type.name}>{type.icon}</span>
                  {type.name}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeType(type.id);
                    }}
                    className="ml-1 hover:text-primary-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))
            ) : (
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
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border-2 border-primary-500/30 rounded-lg shadow-xl">
          {/* Search input */}
          <div className="p-2 border-b border-primary-500/20">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-gray-700/80 border-2 border-primary-500/20 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto">
            {filteredTypes.length > 0 ? (
              filteredTypes.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleTypeToggle(type.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-primary-500/10 transition-colors ${
                    selectedTypes.includes(type.id) 
                      ? 'bg-primary-500/20 border-l-4 border-primary-500' 
                      : 'border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" role="img" aria-label={type.name}>
                      {type.icon}
                    </span>
                    <div>
                      <div className={`font-semibold ${
                        selectedTypes.includes(type.id) 
                          ? 'text-primary-100' 
                          : 'text-gray-100'
                      }`}>
                        {type.name}
                      </div>
                      {type.description && (
                        <div className="text-sm text-gray-400 mt-0.5">{type.description}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-gray-400 text-center">No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TalentTypeSelector; 