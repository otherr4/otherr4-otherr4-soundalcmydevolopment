export const validateImage = (file: File): { isValid: boolean; error?: string } => {
  // Check file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'Image size must be less than 5MB'
    };
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'File must be an image'
    };
  }

  // Check image dimensions
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (img.width > 2000 || img.height > 2000) {
        resolve({
          isValid: false,
          error: 'Image dimensions must be less than 2000x2000 pixels'
        });
      } else {
        resolve({ isValid: true });
      }
    };
    img.onerror = () => {
      resolve({
        isValid: false,
        error: 'Invalid image file'
      });
    };
    img.src = URL.createObjectURL(file);
  });
}; 