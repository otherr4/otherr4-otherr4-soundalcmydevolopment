export const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new file with the compressed blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.8 // Quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

export const validateImage = (file: File): boolean => {
  // Check file type
  const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return false;
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    return false;
  }

  return true;
}; 

const imageCache = new Map<string, string>();

export function getGoogleDriveDirectUrl(url: string): string {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    let fileId = '';
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
      fileId = fileIdMatch[1];
    } else {
      const ucMatch = url.match(/[?&]id=([^&]+)/);
      if (ucMatch) fileId = ucMatch[1];
      else {
        const openMatch = url.match(/\bid=([^&]+)/);
        if (openMatch) fileId = openMatch[1];
      }
    }
    if (fileId) {
      // Use optimized direct URL without timestamp for better caching
      return `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}`;
    }
  }
  return url;
}

export function getProfileImageUrl(path?: string): string {
  if (!path) return '/default-avatar.svg';

  // If it's a local blob URL, return as is for preview
  if (path.startsWith('blob:')) {
    return path;
  }

  // Check cache first
  if (imageCache.has(path)) {
    return imageCache.get(path)!;
  }

  let resolvedUrl = '';

  // Handle Google URLs (both photoURL and Google Drive)
  if (path.includes('googleusercontent.com') || path.includes('lh3.googleusercontent.com')) {
    // Google user profile images - use directly
    resolvedUrl = path;
  } else if (path.includes('drive.google.com')) {
    resolvedUrl = getGoogleDriveDirectUrl(path);
  } else if (path.startsWith('/')) {
    // Local paths - use as is
    resolvedUrl = path;
  } else if (path.startsWith('http')) {
    // External URLs - use as is
    resolvedUrl = path;
  } else if (path.includes('profile_')) {
    // Firebase Storage paths - construct full URL
    resolvedUrl = `https://firebasestorage.googleapis.com/v0/b/soundalchemy-company.appspot.com/o/usersproflesphotos%2F${path}?alt=media`;
  } else {
    // Fallback - use as is
    resolvedUrl = path;
  }

  // Cache the resolved URL
  imageCache.set(path, resolvedUrl);
  return resolvedUrl;
}

// Enhanced function for profile images with better error handling
export function getProfileImageUrlWithFallback(path?: string, fallback: string = '/default-avatar.svg'): string {
  try {
    const url = getProfileImageUrl(path);
    return url || fallback;
  } catch (error) {
    console.error('Error resolving profile image URL:', error);
    return fallback;
  }
} 