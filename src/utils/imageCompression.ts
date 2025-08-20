import Compressor from 'compressorjs';

export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
      success(result) {
        resolve(result as File);
      },
      error(err) {
        reject(err);
      },
    });
  });
};