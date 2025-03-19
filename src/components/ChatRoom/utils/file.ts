
import * as CryptoJS from 'crypto-js';
export enum MediaFormat {
  CSS = 'CSS',
  DOC = 'DOC',
  DOCX = 'DOCX',
  GIF = 'GIF',
  HTML = 'HTML',
  JPEG = 'JPEG',
  JPG = 'JPG',
  JSON = 'JSON',
  MOV = 'MOV',
  MP3 = 'MP3',
  MP4 = 'MP4',
  OTHER = 'OTHER',
  PDF = 'PDF',
  PNG = 'PNG',
  WEBP = 'WEBP',
  PPT = 'PPT',
  PPTX = 'PPTX',
  TXT = 'TXT',
  WAV = 'WAV',
  XLS = 'XLS',
  XLSX = 'XLSX',
  XML = 'XML',
}
export enum FileType {
  JPG = 'image/jpg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  JPEG = 'image/jpeg',
  GIF = 'image/gif',
  ICO = 'image/x-ico',
  SVG = 'image/svg+xml',
  JSON = 'application/json',
  PDF = 'application/pdf',
  DOC = 'application/msword',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLS = 'application/vnd.ms-excel',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  PPT = 'application/vnd.ms-powerpoint',
  PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  MOV = 'video/quicktime',
  MP4 = 'video/mp4',
  MP3 = 'audio/mpeg',
  WAV = 'audio/wav',
}

export const generateFileContentMd5Base64 = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = (e: any) => {
      if (e?.target?.result) {
        const wordArray = CryptoJS.lib.WordArray.create(e?.target?.result);
        const hash: string = CryptoJS.enc.Base64.stringify(
          CryptoJS.MD5(wordArray)
        );
        resolve(hash);
      } else {
        reject(new Error(''));
      }
    };
    reader.onerror = () => {
      reject(new Error(''));
    };
    reader.readAsArrayBuffer(file);
  });
};
