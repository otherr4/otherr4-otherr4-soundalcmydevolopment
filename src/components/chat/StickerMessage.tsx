import React from 'react';

interface StickerMessageProps {
  stickerUrl: string;
  stickerName: string;
  size?: 'small' | 'medium' | 'large';
}

const StickerMessage: React.FC<StickerMessageProps> = ({ 
  stickerUrl, 
  stickerName, 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  // Check if it's a real sticker image (SVG/PNG) or emoji
  const isImageSticker = stickerUrl.startsWith('/') || stickerUrl.startsWith('http');
  
  // Get fallback emoji for when image fails to load
  const getFallbackEmoji = () => {
    if (stickerUrl.startsWith('/soundalchemy-stickers/')) {
      const stickerName = stickerUrl.split('/').pop()?.replace('.svg', '') || '';
      const emojiMap: Record<string, string> = {
        'band-sticker': '🎵', 'concert-sticker': '🎪', 'studio-sticker': '🎤',
        'funny-musician': '🎸', 'drummer-crazy': '🥁', 'pianist-funny': '🎹',
        'soundalchemy-logo-funny': '🎵', 'guitarist-animated': '🎸', 
        'headbanger-guitarist': '🤘', 'guitar-solo-shredder': '🔥'
      };
      return emojiMap[stickerName] || '🎵';
    }
    
    if (stickerUrl.startsWith('/stickers/')) {
      const stickerName = stickerUrl.split('/').pop()?.replace('.png', '') || '';
      const emojiMap: Record<string, string> = {
        guitar: '🎸', piano: '🎹', drums: '🥁', microphone: '🎤', headphones: '🎧',
        'music-note': '🎵', vinyl: '💿', concert: '🎪', happy: '😊', sad: '😢',
        excited: '🤩', love: '🥰', cool: '😎', surprised: '😲', laughing: '😂',
        wink: '😉', cat: '🐱', dog: '🐕', bird: '🐦', fish: '🐠', rabbit: '🐰',
        hamster: '🐹', penguin: '🐧', owl: '🦉', pizza: '🍕', burger: '🍔',
        'ice-cream': '🍦', cake: '🎂', coffee: '☕', sushi: '🍣', taco: '🌮', donut: '🍩'
      };
      return emojiMap[stickerName] || '😊';
    }
    
    return stickerUrl;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
      {isImageSticker ? (
        <div className={`${sizeClasses[size]} mb-2 flex items-center justify-center`}>
          <img
            src={stickerUrl}
            alt={stickerName}
            className="w-full h-full object-contain"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallbackDiv = target.nextElementSibling as HTMLElement;
              if (fallbackDiv) {
                fallbackDiv.style.display = 'block';
              }
            }}
          />
          <div 
            className="text-4xl hidden"
            style={{ display: 'none' }}
          >
            {getFallbackEmoji()}
          </div>
        </div>
      ) : (
        <div className={`${sizeClasses[size]} mb-2 flex items-center justify-center text-4xl`}>
          {stickerUrl}
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">
        {stickerName}
      </p>
    </div>
  );
};

export default StickerMessage; 