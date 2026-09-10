import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
  // If it's not an image, don't compress
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // If size is less than 200KB, don't compress much
  if (file.size < 200 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 0.15, // Aim for < 150KB
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error('Compression error:', error);
    return file;
  }
};
