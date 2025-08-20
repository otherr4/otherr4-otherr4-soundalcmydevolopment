import React, { useState, useRef, useEffect } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { Smile, Sticker, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onStickerSelect?: (sticker: { url: string; name: string }) => void;
  keepOpenAfterSelect?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
  caretPosition?: number;
  onCaretPositionChange?: (position: number) => void;
}

// Sticker categories and data
const STICKER_CATEGORIES = [
  {
    id: 'soundalchemy',
    name: 'SoundAlchemy',
    icon: '🎵',
    stickers: [
      { id: 'band', url: '/soundalchemy-stickers/band-sticker.svg', name: 'Band' },
      { id: 'concert', url: '/soundalchemy-stickers/concert-sticker.svg', name: 'Concert' },
      { id: 'studio', url: '/soundalchemy-stickers/studio-sticker.svg', name: 'Studio' },
      { id: 'funny-musician', url: '/soundalchemy-stickers/funny-musician.svg', name: 'Rock Star' },
      { id: 'drummer-crazy', url: '/soundalchemy-stickers/drummer-crazy.svg', name: 'Drum Solo' },
      { id: 'pianist-funny', url: '/soundalchemy-stickers/pianist-funny.svg', name: 'Maestro' },
      { id: 'soundalchemy-logo-funny', url: '/soundalchemy-stickers/soundalchemy-logo-funny.svg', name: 'SoundAlchemy!' },
      { id: 'guitarist-animated', url: '/soundalchemy-stickers/guitarist-animated.svg', name: 'Rock On!' },
      { id: 'headbanger-guitarist', url: '/soundalchemy-stickers/headbanger-guitarist.svg', name: 'Headbang!' },
      { id: 'guitar-solo-shredder', url: '/soundalchemy-stickers/guitar-solo-shredder.svg', name: 'Shred!' },
    ]
  },
  {
    id: 'music',
    name: 'Music',
    icon: '🎵',
    stickers: [
      { id: 'guitar', url: '/stickers/guitar.png', name: 'Guitar' },
      { id: 'piano', url: '/stickers/piano.png', name: 'Piano' },
      { id: 'drums', url: '/stickers/drums.png', name: 'Drums' },
      { id: 'microphone', url: '/stickers/microphone.png', name: 'Microphone' },
      { id: 'headphones', url: '/stickers/headphones.png', name: 'Headphones' },
      { id: 'music-note', url: '/stickers/music-note.png', name: 'Music Note' },
      { id: 'vinyl', url: '/stickers/vinyl.png', name: 'Vinyl' },
      { id: 'concert', url: '/stickers/concert.png', name: 'Concert' },
    ]
  },
  {
    id: 'emotions',
    name: 'Emotions',
    icon: '😊',
    stickers: [
      { id: 'happy', url: '/stickers/happy.png', name: 'Happy' },
      { id: 'sad', url: '/stickers/sad.png', name: 'Sad' },
      { id: 'excited', url: '/stickers/excited.png', name: 'Excited' },
      { id: 'love', url: '/stickers/love.png', name: 'Love' },
      { id: 'cool', url: '/stickers/cool.png', name: 'Cool' },
      { id: 'surprised', url: '/stickers/surprised.png', name: 'Surprised' },
      { id: 'laughing', url: '/stickers/laughing.png', name: 'Laughing' },
      { id: 'wink', url: '/stickers/wink.png', name: 'Wink' },
    ]
  },
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐾',
    stickers: [
      { id: 'cat', url: '/stickers/cat.png', name: 'Cat' },
      { id: 'dog', url: '/stickers/dog.png', name: 'Dog' },
      { id: 'bird', url: '/stickers/bird.png', name: 'Bird' },
      { id: 'fish', url: '/stickers/fish.png', name: 'Fish' },
      { id: 'rabbit', url: '/stickers/rabbit.png', name: 'Rabbit' },
      { id: 'hamster', url: '/stickers/hamster.png', name: 'Hamster' },
      { id: 'penguin', url: '/stickers/penguin.png', name: 'Penguin' },
      { id: 'owl', url: '/stickers/owl.png', name: 'Owl' },
    ]
  },
  {
    id: 'food',
    name: 'Food',
    icon: '🍕',
    stickers: [
      { id: 'pizza', url: '/stickers/pizza.png', name: 'Pizza' },
      { id: 'burger', url: '/stickers/burger.png', name: 'Burger' },
      { id: 'ice-cream', url: '/stickers/ice-cream.png', name: 'Ice Cream' },
      { id: 'cake', url: '/stickers/cake.png', name: 'Cake' },
      { id: 'coffee', url: '/stickers/coffee.png', name: 'Coffee' },
      { id: 'sushi', url: '/stickers/sushi.png', name: 'Sushi' },
      { id: 'taco', url: '/stickers/taco.png', name: 'Taco' },
      { id: 'donut', url: '/stickers/donut.png', name: 'Donut' },
    ]
  }
];

// Fallback sticker URLs (using emoji as placeholders)
const getFallbackStickerUrl = (name: string) => {
  const emojiMap: Record<string, string> = {
    guitar: '🎸', piano: '🎹', drums: '🥁', microphone: '🎤', headphones: '🎧',
    'music-note': '🎵', vinyl: '💿', happy: '😊', sad: '😢',
    excited: '🤩', love: '🥰', cool: '😎', surprised: '😲', laughing: '😂',
    wink: '😉', cat: '🐱', dog: '🐕', bird: '🐦', fish: '🐠', rabbit: '🐰',
    hamster: '🐹', penguin: '🐧', owl: '🦉', pizza: '🍕', burger: '🍔',
    'ice-cream': '🍦', cake: '🎂', coffee: '☕', sushi: '🍣', taco: '🌮', donut: '🍩',
    // SoundAlchemy stickers
    band: '🎵', concert: '🎪', studio: '🎤', 'funny-musician': '🎸', 'drummer-crazy': '🥁', 
    'pianist-funny': '🎹', 'soundalchemy-logo-funny': '🎵', 'guitarist-animated': '🎸', 
    'headbanger-guitarist': '🤘', 'guitar-solo-shredder': '🔥'
  };
  return emojiMap[name] || '😊';
};

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  onEmojiSelect, 
  onStickerSelect,
  keepOpenAfterSelect = false,
  inputRef,
  caretPosition = 0,
  onCaretPositionChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'emoji' | 'sticker'>('emoji');
  const [selectedStickerCategory, setSelectedStickerCategory] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null); // NEW: wrapper ref
  const [pickerError, setPickerError] = useState<string | null>(null);

  // Close picker on outside click or Esc
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  const handleEmojiSelect = (emoji: any) => {
    console.log('[EmojiPicker] Emoji selected:', emoji);
    
    // Try all possible emoji representations
    const emojiChar = emoji.native || emoji.emoji || emoji.id || emoji.unified || '';
    
    if (emojiChar) {
      console.log('[EmojiPicker] Resolved emoji:', emojiChar);
      handleEmojiInsert(emojiChar);
    } else {
      console.warn('[EmojiPicker] Unknown emoji object:', emoji);
      // Try to use the emoji object directly
      handleEmojiInsert(String(emoji));
    }
  };

  const handleStickerSelect = (sticker: any) => {
    console.log('[EmojiPicker] Sticker selected:', sticker);
    if (onStickerSelect) {
      onStickerSelect({
        url: sticker.url || getFallbackStickerUrl(sticker.name),
        name: sticker.name
      });
    }
    if (!keepOpenAfterSelect) setIsOpen(false);
  };

  const insertAtCaret = (text: string) => {
    console.log('[EmojiPicker] insertAtCaret called with text:', text);
    console.log('[EmojiPicker] inputRef available:', !!inputRef?.current);
    console.log('[EmojiPicker] caretPosition prop:', caretPosition);
    
    if (inputRef?.current) {
      const input = inputRef.current;
      console.log('[EmojiPicker] Current input value:', input.value);
      console.log('[EmojiPicker] Current selection:', input.selectionStart, 'to', input.selectionEnd);
      
      // Use the caretPosition prop if available, otherwise use current selection
      const start = caretPosition !== undefined ? caretPosition : (input.selectionStart || 0);
      const end = caretPosition !== undefined ? caretPosition : (input.selectionEnd || 0);
      const currentValue = input.value;
      const before = currentValue.substring(0, start);
      const after = currentValue.substring(end);
      
      const newValue = before + text + after;
      
      console.log('[EmojiPicker] Inserting at position:', start);
      console.log('[EmojiPicker] Before:', before);
      console.log('[EmojiPicker] After:', after);
      console.log('[EmojiPicker] New value:', newValue);
      
      // Update the input value
      input.value = newValue;
      
      // Set cursor position after the inserted text
      const newPosition = start + text.length;
      input.setSelectionRange(newPosition, newPosition);
      input.focus();
      
      // Trigger change event to update React state
      const event = new Event('input', { bubbles: true });
      input.dispatchEvent(event);
      
      // Also trigger onChange if it exists
      const changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(changeEvent);
      
      // Update caret position
      if (onCaretPositionChange) {
        onCaretPositionChange(newPosition);
      }
      
      console.log('[EmojiPicker] Successfully inserted emoji at position:', newPosition);
      console.log('[EmojiPicker] Final input value:', input.value);
    } else {
      console.warn('[EmojiPicker] No input ref available');
    }
  };

  const handleEmojiInsert = (emoji: string) => {
    console.log('[EmojiPicker] Inserting emoji:', emoji);
    
    // Insert at caret position
    insertAtCaret(emoji);
    
    // Also call the onEmojiSelect callback for any additional handling
    onEmojiSelect(emoji);
    
    if (!keepOpenAfterSelect) {
      setIsOpen(false);
    }
  };

  // Fallback emoji insertion if the main method fails
  const fallbackEmojiInsert = (emoji: string) => {
    console.log('[EmojiPicker] Using fallback emoji insertion for:', emoji);
    
    // Try to update the parent component's state directly
    if (onEmojiSelect) {
      onEmojiSelect(emoji);
    }
    
    if (!keepOpenAfterSelect) {
      setIsOpen(false);
    }
  };

  // Fallback emoji and sticker lists
  const fallbackEmojis = ['🎵', '🎸', '🎹', '🥁', '🎤', '🎧', '😊', '😂', '🥰', '😎', '🤔', '😢', '😡', '🤗', '❤️', '👍'];
  const fallbackStickers = ['🎵', '🎸', '🎹', '🥁', '🎤', '🎧', '💿', '🎪', '😊', '😢', '🤩', '🥰', '😎', '😲', '😂', '😉'];

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setPickerError(null); // Reset error when opening
          if (!isOpen) {
            console.log('[EmojiPicker] Picker opened');
            // Test emoji insertion when opening
            setTimeout(() => {
              console.log('[EmojiPicker] Testing emoji insertion...');
              if (inputRef?.current) {
                console.log('[EmojiPicker] Input ref found, current value:', inputRef.current.value);
              } else {
                console.log('[EmojiPicker] No input ref available');
              }
            }, 100);
          }
        }}
        className="p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Open emoji and sticker picker"
      >
        <Smile className="w-4 h-4" />
      </button>
      {isOpen && (
        <div
          className={`z-50 bg-dark-800 flex flex-col shadow-xl border border-dark-600 ${
            typeof window !== 'undefined' && window.innerWidth <= 640
              ? 'fixed left-0 right-0 bottom-0 w-full max-h-[70vh] rounded-t-2xl p-2 pb-[env(safe-area-inset-bottom)]' // Mobile bottom sheet
              : 'absolute bottom-14 left-1/2 -translate-x-1/2 w-[90vw] max-w-xs rounded-xl p-2'
          }`}
          style={{ minWidth: 0, marginBottom: 8, overflowY: 'auto' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header with tabs */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-dark-600 bg-dark-800 rounded-t-xl" style={{ minHeight: 40 }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('emoji')}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors text-base min-w-[44px] min-h-[44px] ${
                  activeTab === 'emoji' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
                style={{ fontSize: '1.1em' }}
              >
                <Smile className="w-6 h-6" />
                <span>Emoji</span>
              </button>
              <button
                onClick={() => setActiveTab('sticker')}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors text-base min-w-[44px] min-h-[44px] ${
                  activeTab === 'sticker' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
                style={{ fontSize: '1.1em' }}
              >
                <Sticker className="w-6 h-6" />
                <span>Stickers</span>
              </button>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center w-11 h-11 rounded-full text-gray-400 hover:text-white hover:bg-dark-700 transition-colors ml-1"
              aria-label="Close emoji picker"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {/* Content */}
          <div className="p-2 overflow-y-auto" style={{ maxHeight: typeof window !== 'undefined' && window.innerWidth <= 640 ? '50vh' : 260 }}>
            {pickerError ? (
              <div className="text-red-500 text-center p-2 text-xs">
                <p>😢 Emoji picker failed to load.</p>
                <p>{pickerError}</p>
              </div>
            ) : activeTab === 'emoji' ? (
              <div className="space-y-2">
                {/* SoundAlchemy Custom Emojis */}
                <div className="border-b border-dark-600 pb-2 mb-2">
                  <div className="grid grid-cols-8 gap-1">
                    {[
                      { emoji: '🎵', name: 'Music Note', url: '/soundalchemy-emojis/music-note.svg' },
                      { emoji: '🎸', name: 'Guitar', url: '/soundalchemy-emojis/guitar.svg' },
                      { emoji: '🎹', name: 'Piano', url: '/soundalchemy-emojis/piano.svg' },
                      { emoji: '🥁', name: 'Drums', url: '/soundalchemy-emojis/drums.svg' },
                      { emoji: '🎤', name: 'Microphone', url: '/soundalchemy-emojis/microphone.svg' },
                      { emoji: '🎧', name: 'Headphones', url: '/soundalchemy-emojis/headphones.svg' },
                      { emoji: '🎵', name: 'Logo', url: '/soundalchemy-emojis/music-logo.svg' },
                    ].map((item) => (
                      <button
                        key={item.name}
                        onClick={() => {
                          try {
                            handleEmojiInsert(item.emoji);
                          } catch (error) {
                            console.error('[EmojiPicker] Error with handleEmojiInsert, using fallback:', error);
                            fallbackEmojiInsert(item.emoji);
                          }
                        }}
                        className="p-1 text-xl hover:bg-dark-700 rounded-lg transition-colors relative group"
                        title={item.name}
                      >
                        {item.emoji}
                        <div className="absolute inset-0 bg-primary-500/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Quick emoji categories */}
                <div className="grid grid-cols-8 gap-1">
                  {fallbackEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        try {
                          handleEmojiInsert(emoji);
                        } catch (error) {
                          console.error('[EmojiPicker] Error with handleEmojiInsert, using fallback:', error);
                          fallbackEmojiInsert(emoji);
                        }
                      }}
                      className="p-1 text-xl hover:bg-dark-700 rounded-lg transition-colors"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {/* Full emoji picker */}
                <div className="border-t border-dark-600 pt-4">
                  {/* Try/catch for emoji picker rendering */}
                  {(() => {
                    try {
                      return (
                        <Picker
                          data={data}
                          onEmojiSelect={handleEmojiSelect}
                          theme="dark"
                          set="native"
                          showPreview={false}
                          showSkinTones={false}
                          previewPosition="none"
                          style={{ width: '100%' }}
                        />
                      );
                    } catch (err: any) {
                      const errorMsg = err?.message || String(err);
                      setPickerError(errorMsg);
                      console.error('[EmojiPicker] Emoji-mart Picker failed:', err);
                      return null;
                    }
                  })()}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Sticker category navigation */}
                {STICKER_CATEGORIES && STICKER_CATEGORIES.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedStickerCategory(prev => 
                          prev > 0 ? prev - 1 : STICKER_CATEGORIES.length - 1
                        )}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {STICKER_CATEGORIES[selectedStickerCategory]?.icon}
                        </span>
                        <span className="text-white font-medium">
                          {STICKER_CATEGORIES[selectedStickerCategory]?.name}
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedStickerCategory(prev => 
                          prev < STICKER_CATEGORIES.length - 1 ? prev + 1 : 0
                        )}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Sticker grid */}
                    <div className="grid grid-cols-4 gap-3">
                      {STICKER_CATEGORIES[selectedStickerCategory]?.stickers.map((sticker) => (
                        <button
                          key={sticker.id}
                          onClick={() => handleStickerSelect(sticker)}
                          className="p-2 hover:bg-dark-700 rounded-lg transition-colors group"
                          title={sticker.name}
                        >
                          <div className="w-12 h-12 flex items-center justify-center bg-dark-700 rounded-lg group-hover:bg-dark-600 transition-colors overflow-hidden">
                            {sticker.url.endsWith('.svg') || sticker.url.endsWith('.png') ? (
                              <img
                                src={sticker.url}
                                alt={sticker.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  // Fallback to emoji if image fails
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const fallbackDiv = target.nextElementSibling as HTMLElement;
                                  if (fallbackDiv) {
                                    fallbackDiv.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div 
                              className="text-2xl hidden items-center justify-center w-full h-full"
                              style={{ display: sticker.url.endsWith('.svg') || sticker.url.endsWith('.png') ? 'none' : 'flex' }}
                            >
                              {getFallbackStickerUrl(sticker.name)}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {sticker.name}
                          </p>
                        </button>
                      ))}
                    </div>

                    {/* Category dots */}
                    <div className="flex items-center justify-center gap-2">
                      {STICKER_CATEGORIES.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedStickerCategory(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === selectedStickerCategory 
                              ? 'bg-primary-500' 
                              : 'bg-dark-600 hover:bg-dark-500'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-yellow-400 text-center p-4">
                    <p>⚠️ No sticker categories found. Showing fallback stickers:</p>
                    <div className="grid grid-cols-8 gap-2 mt-2">
                      {fallbackStickers.map((sticker, i) => (
                        <button
                          key={sticker + i}
                          onClick={() => handleStickerSelect({ name: sticker, url: sticker })}
                          className="p-2 text-2xl hover:bg-dark-700 rounded-lg transition-colors"
                          title={sticker}
                        >
                          {sticker}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 