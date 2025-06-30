import { useState, useCallback } from 'react';
import type { UploadFile, UploadChangeParam } from "antd/es/upload/interface";
import { Modal } from "antd";
import { useAppContext } from "zvm-code-context";
import { GQL_IMAGE_PRESIGNED_URL } from "../graphQL/zai";
import {
  generateFileContentMd5Base64,
  MediaFormat,
  FileType,
} from "../utils/file";

// 上传图片数据结构
export interface UploadedImage {
  imageId: string;
  previewUrl: string;
}

// 文件上传Hook的返回值类型
export interface UseFileUploadReturn {
  uploadedImages: UploadedImage[];
  handleFileChange: (info: UploadChangeParam<UploadFile>) => Promise<void>;
  removeImage: (index: number) => void;
  clearImages: () => void;
}

/**
 * 文件上传处理Hook
 * 负责处理图片上传、预览、删除等功能
 */
export const useFileUpload = (): UseFileUploadReturn => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const { query } = useAppContext();

  /**
   * 显示错误信息
   */
  const showError = (errorMessage: string) => {
    Modal.error({
      title: "Error",
      content: errorMessage,
    });
  };

  /**
   * 文件上传处理
   */
  const handleFileChange = useCallback(async (info: UploadChangeParam<UploadFile>) => {
    const file = info.file;
    if (!file) return;

    try {
      const fileObject = file instanceof File ? file : file.originFileObj;
      if (!fileObject) {
        throw new Error("Unable to get file object");
      }

      const imgMd5Base64 = await generateFileContentMd5Base64(fileObject);

      // 获取文件格式
      const fileExtension = file.name.split(".").pop()?.toUpperCase();
      const fileFormat: MediaFormat =
        (Object.entries(FileType).find(
          ([type, mime]) =>
            file.type === mime ||
            type.toLowerCase() === fileExtension?.toLowerCase()
        )?.[0] as MediaFormat) ?? MediaFormat.OTHER;

      const response = await query(GQL_IMAGE_PRESIGNED_URL, {
        imgMd5Base64,
        imageSuffix: fileFormat,
      });

      if (response.error || response.errors) {
        throw new Error(
          response.error?.message ||
            response.errors?.[0]?.message ||
            "Failed to get upload URL"
        );
      }

      const { imagePresignedUrl } = response.data;
      const { imageId } = imagePresignedUrl;

      if (!imagePresignedUrl?.uploadUrl || !imagePresignedUrl?.contentType) {
        return;
      }
      
      const uploadResponse = await fetch(imagePresignedUrl.uploadUrl, {
        method: "PUT",
        body: fileObject,
        headers: imagePresignedUrl.uploadHeaders ?? {
          "Content-Type": imagePresignedUrl.contentType,
          "Content-MD5": imgMd5Base64,
        },
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      // 设置预览图
      setUploadedImages((prev) => [
        ...prev,
        {
          imageId,
          previewUrl: URL.createObjectURL(fileObject),
        },
      ]);
    } catch (error: any) {
      console.error("Image upload failed:", error);
      showError(error.message || "Image upload failed");
    }
  }, [query]);

  /**
   * 删除指定索引的图片
   */
  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * 清空所有图片
   */
  const clearImages = useCallback(() => {
    setUploadedImages([]);
  }, []);

  return {
    uploadedImages,
    handleFileChange,
    removeImage,
    clearImages,
  };
}; 