import SparkMD5 from 'spark-md5';

interface FileHashOptions {
  bufferSize?: number;
  onProgress?: (progress: number) => void;
}

const DEFAULT_OPTIONS: Required<FileHashOptions> = {
  bufferSize: 2 * 1024 * 1024,
  onProgress: () => {}
};

export const getBase64 = (
  file: File,
  options: FileHashOptions = {}
): Promise<string> => {
  const { bufferSize, onProgress } = { ...DEFAULT_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    const hashAlgorithm = new SparkMD5.ArrayBuffer();
    const totalParts = Math.ceil(file.size / bufferSize);
    let currentPart = 0;

    fileReader.onload = (e) => {
      currentPart += 1;
      const buffer = e?.target?.result;
      
      if (!buffer) {
        reject(new Error('Failed to read file buffer'));
        return;
      }

      hashAlgorithm.append(buffer as ArrayBuffer);
      onProgress(Math.round((currentPart / totalParts) * 100));

      if (currentPart < totalParts) {
        processNextPart();
        return;
      }

      resolve(window.btoa(hashAlgorithm.end(true)));
    };

    fileReader.onerror = reject;

    const processNextPart = () => {
      const start = currentPart * bufferSize;
      const end = Math.min(start + bufferSize, file.size);
      fileReader.readAsArrayBuffer(file.slice(start, end));
    };

    processNextPart();
  });
};