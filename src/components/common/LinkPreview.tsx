import React, { useState, useEffect } from 'react';
import { ExternalLink, Play, Music, Video, Image, FileText } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
  onRemove?: () => void;
}

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
  type: 'youtube' | 'facebook' | 'instagram' | 'twitter' | 'spotify' | 'soundcloud' | 'other';
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url, onRemove }) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractMetadata = async () => {
      try {
        setLoading(true);
        setError(null);

        // Extract basic info from URL
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        let linkType: LinkMetadata['type'] = 'other';
        let title = '';
        let description = '';
        let image = '';

        // YouTube
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
          linkType = 'youtube';
          const videoId = urlObj.searchParams.get('v') || urlObj.pathname.split('/').pop();
          if (videoId) {
            image = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            title = 'YouTube Video';
            description = `Watch on YouTube`;
          }
        }
        // Facebook
        else if (hostname.includes('facebook.com') || hostname.includes('fb.com')) {
          linkType = 'facebook';
          title = 'Facebook Post';
          description = 'View on Facebook';
          image = '/public/Logos/SoundAlcmyLogo2.png'; // Default image
        }
        // Instagram
        else if (hostname.includes('instagram.com')) {
          linkType = 'instagram';
          title = 'Instagram Post';
          description = 'View on Instagram';
          image = '/public/Logos/SoundAlcmyLogo2.png';
        }
        // Twitter/X
        else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
          linkType = 'twitter';
          title = 'Twitter Post';
          description = 'View on Twitter';
          image = '/public/Logos/SoundAlcmyLogo2.png';
        }
        // Spotify
        else if (hostname.includes('spotify.com')) {
          linkType = 'spotify';
          title = 'Spotify Track';
          description = 'Listen on Spotify';
          image = '/public/Logos/SoundAlcmyLogo2.png';
        }
        // SoundCloud
        else if (hostname.includes('soundcloud.com')) {
          linkType = 'soundcloud';
          title = 'SoundCloud Track';
          description = 'Listen on SoundCloud';
          image = '/public/Logos/SoundAlcmyLogo2.png';
        }
        // Generic
        else {
          title = 'External Link';
          description = urlObj.hostname;
          image = '/public/Logos/SoundAlcmyLogo2.png';
        }

        setMetadata({
          title,
          description,
          image,
          type: linkType
        });
      } catch (err) {
        setError('Failed to load link preview');
        console.error('Error extracting link metadata:', err);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      extractMetadata();
    }
  }, [url]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'youtube': return <Play className="w-5 h-5" />;
      case 'spotify': return <Music className="w-5 h-5" />;
      case 'soundcloud': return <Music className="w-5 h-5" />;
      case 'facebook': return <ExternalLink className="w-5 h-5" />;
      case 'instagram': return <Image className="w-5 h-5" />;
      case 'twitter': return <ExternalLink className="w-5 h-5" />;
      default: return <ExternalLink className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'youtube': return 'bg-red-600';
      case 'spotify': return 'bg-green-600';
      case 'soundcloud': return 'bg-orange-600';
      case 'facebook': return 'bg-blue-600';
      case 'instagram': return 'bg-pink-600';
      case 'twitter': return 'bg-blue-400';
      default: return 'bg-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
        <div className="animate-pulse">
          <div className="h-4 bg-dark-700 rounded mb-2"></div>
          <div className="h-3 bg-dark-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="bg-dark-800 rounded-lg p-4 border border-red-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ExternalLink className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">Invalid link</span>
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
      <div className="flex">
        <div className="w-24 h-24 bg-dark-700 flex items-center justify-center">
          <img
            src={metadata.image}
            alt={metadata.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/public/Logos/SoundAlcmyLogo2.png';
            }}
          />
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(metadata.type)}`}>
                  {metadata.type.toUpperCase()}
                </span>
                {getIcon(metadata.type)}
              </div>
              <h4 className="font-semibold text-white mb-1">{metadata.title}</h4>
              <p className="text-gray-400 text-sm mb-2">{metadata.description}</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 text-sm flex items-center space-x-1"
              >
                <span>Open Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {onRemove && (
              <button
                onClick={onRemove}
                className="text-gray-400 hover:text-red-400 transition-colors ml-2"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkPreview; 