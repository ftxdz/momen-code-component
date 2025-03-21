import { Input, Button, Upload, Modal } from "antd";
import type { UploadFile, UploadChangeParam } from "antd/es/upload/interface";
import styles from "./ChatRoom.module.css";
import {
  SendOutlined,
  PictureOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { GQL_IMAGE_PRESIGNED_URL, GQL_SEND_MESSAGE } from "./graphQL/zai";
import { GQL_SUBSCRIPTION_FOR_CONVERSATION } from "./graphQL/zai/subscription";
import { GQL_SUBSCRIPTION_FOR_CHATMESSAGE } from "./config/graphQL/subscription";
import { GQL_SEND_CHATROOM_MESSAGE } from "./config/graphQL/index";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAppContext, EventHandler, State } from "zvm-code-context";

import {
  generateFileContentMd5Base64,
  MediaFormat,
  FileType,
} from "./utils/file";
import React from "react";
import ReactMarkdown from "react-markdown";
import { transformChatroomMessages } from "./config/messageTransformer";
import { buildChatroomMessageObjects } from "./config/messageBuilder";
import { Message, MessageContent, UploadedImage } from "./types";

declare global {
  interface Window {
    _debug_last_ws_payload: any;
  }
}

export interface ChatRoomPropData {
  placeholder?: string;
  conversationId: number;
  accountId: number;
  isMomenAI: boolean;
  userImageUrl?: string;
  assistantImageUrl?: string;
}

export interface ChatRoomStateData {
  sendMessageError?: State<string>;
  subscribeMessageError?: State<string>;
}

export interface ChatRoomEvent {
  onSendMessageSuccess?: EventHandler;
  onSendMessageError?: EventHandler;
  onSubscribeMessageError?: EventHandler;
}

export interface ChatRoomProps {
  propData: ChatRoomPropData;
  propState: ChatRoomStateData;
  event: ChatRoomEvent;
}

const ChatRoomInner = ({
  propData,
  event,
  propState,
  apolloClient,
}: ChatRoomProps & { apolloClient: any }) => {
  const isMomenAI =
    typeof propData.isMomenAI === "boolean"
      ? propData.isMomenAI
      : propData.isMomenAI == "true";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const { query } = useAppContext();

  const messageListRef = useRef<HTMLDivElement>(null);

  const updateMessages = useCallback((messageData: Message | Message[]) => {
    setMessages((prevMessages) => {
      const newMessages = Array.isArray(messageData)
        ? messageData
        : [messageData];

      const uniqueNewMessages = newMessages.filter(
        (newMsg) =>
          !prevMessages.some((existingMsg) => existingMsg.id === newMsg.id)
      );

      if (uniqueNewMessages.length === 0) {
        return prevMessages;
      }

      return [...prevMessages, ...uniqueNewMessages];
    });
  }, []);

  const showError = (errorMessage: string) => {
    Modal.error({
      title: "Error",
      content: errorMessage,
    });
  };

  useEffect(() => {
    const subscription = apolloClient.subscribe({
      query: isMomenAI
        ? GQL_SUBSCRIPTION_FOR_CONVERSATION
        : GQL_SUBSCRIPTION_FOR_CHATMESSAGE,
      variables: { conversationId: propData.conversationId },
    });

    const subscriber = subscription.subscribe({
      next: ({ data, errors }: { data?: any; errors?: any[] }) => {
        if (errors) {
          showError(errors[0]?.message || "Failed to subscribe to messages");
          return;
        }

        if (isMomenAI && data?.fz_streaming_fz_message) {
          updateMessages(data.fz_streaming_fz_message);
        } else if (!isMomenAI && data?.chatroom_message) {
          const message = transformChatroomMessages(data.chatroom_message);
          updateMessages(message);
        }
      },
      error: async(error: Error) => {
        console.error("Subscription error:", error);
        showError(error.message || "Failed to subscribe to messages");
        await propState.subscribeMessageError?.set(
          error.message || "Failed to subscribe to messages"
        );
        setTimeout(() => {
          event.onSubscribeMessageError?.call(null);
        });
      },
    });

    return () => {
      subscriber.unsubscribe();
    };
  }, [apolloClient, propData.conversationId, propData.isMomenAI]);

  // 发送消息处理
    const handleSend = async () => {
    const hasText = inputValue.trim().length > 0;
    const hasImages = uploadedImages.length > 0;

    if (!hasText && !hasImages) return;

    try {
      if (isMomenAI) {
        const response = await query(GQL_SEND_MESSAGE, {
          conversationId: propData.conversationId,
          text: hasText ? inputValue.trim() : undefined,
          imageIds: hasImages
            ? uploadedImages.map((img) => img.imageId)
            : undefined,
        });
        if (response.error || response.errors) {
          const errorMessage =
            response.error?.message ||
            response.errors?.[0]?.message ||
            "Failed to send message";
          await propState.sendMessageError?.set(errorMessage);
          setTimeout(() => {
            event.onSendMessageError?.call(null);
          });
          return;
        }
        event.onSendMessageSuccess?.call(null);
      } else {
        const messageParams = {
          text: hasText ? inputValue.trim() : undefined,
          imageIds: hasImages
            ? uploadedImages.map((img) => img.imageId)
            : undefined,
          accountId: propData.accountId,
          conversationId: propData.conversationId,
        };

        const response = await query(
          GQL_SEND_CHATROOM_MESSAGE,
          buildChatroomMessageObjects(messageParams)
        );

        if (response.error || response.errors) {
          const errorMessage =
            response.error?.message ||
            response.errors?.[0]?.message ||
            "Failed to send message";
          console.error("Failed to send message:", errorMessage);
          await propState.sendMessageError?.set(errorMessage);
          setTimeout(() => {
            event.onSendMessageError?.call(null);
          });
          event.onSendMessageSuccess?.call(null);

          return;
        }
      }

      setInputValue("");
      setUploadedImages([]);
      event.onSendMessageSuccess?.call(null);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      await propState.sendMessageError?.set(
        error.message || "Failed to send message"
      );
      setTimeout(() => {
        event.onSendMessageError?.call(null);
      });
    }
  };

  // 文件上传处理
  const handleFileChange = async (info: UploadChangeParam<UploadFile>) => {
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

      if (!imagePresignedUrl?.uploadUrl || !imagePresignedUrl?.contentType)
        return {};
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
  };

  // 渲染消息内容
  const renderMessageContent = (
    content: MessageContent,
    contentIndex: number,
    timestamp: string
  ) => (
    <div key={`${content.id}-${contentIndex}`}>
      {content.type === "TEXT" && content.text && (
        <div
          className={styles.textContent}
          title={formatMessageTime(timestamp)}
        >
          <ReactMarkdown>{content.text}</ReactMarkdown>
        </div>
      )}
      {content.type === "IMAGE" && content.image && (
        <div
          className={styles.messageImageWrapper}
          title={formatMessageTime(timestamp)}
        >
          <img
            src={content.image.url}
            alt="Message image"
            className={styles.messageImage}
          />
        </div>
      )}
    </div>
  );

  // 判断是否需要显示时间
  const shouldShowTime = (
    currentMessage: Message,
    previousMessage: Message | null
  ) => {
    if (!previousMessage) return true;

    const currentTime = new Date(currentMessage.created_at).getTime();
    const previousTime = new Date(previousMessage.created_at).getTime();
    const timeDiff = currentTime - previousTime;

    // 如果时间差大于2分钟，显示时间
    return timeDiff > 2 * 60 * 1000;
  };

  // 格式化时间显示
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 渲染时间分割线
  const renderTimeDiv = (timestamp: string) => (
    <div className={styles.timeDiv}>
      <span>{formatMessageTime(timestamp)}</span>
    </div>
  );

  // 渲染消息列表
  const renderMessageList = () => {
    return messages.map((message, index) => {
      const previousMessage = index > 0 ? messages[index - 1] : null;
      const showTime = shouldShowTime(message, previousMessage);
      let isUser;

      // 获取头像 URL
      let avatarUrl: string | undefined;
      if (isMomenAI) {
        // AI 助手模式使用传入的头像
        isUser = message.sender === "user";
        avatarUrl = isUser ? propData.userImageUrl : propData.assistantImageUrl;
      } else {
        // 普通聊天室模式使用数据库中的头像
        isUser = message.sender_id === propData.accountId;
        avatarUrl = message.sender_avatar;
      }

      return (
        <React.Fragment key={`${message.id}-${index}`}>
          {showTime && renderTimeDiv(message.created_at)}
          <div
            className={`${styles.messageItem} ${
              isUser ? styles.userMessage : styles.assistantMessage
            }`}
          >
            {avatarUrl && (
              <img src={avatarUrl} alt={"Avatar"} className={styles.avatar} />
            )}
            <div className={styles.messageContent}>
              {message.contents?.map((content, contentIndex) =>
                renderMessageContent(content, contentIndex, message.created_at)
              )}
            </div>
          </div>
        </React.Fragment>
      );
    });
  };

  // 处理按键事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 如果按下回车键，但没有按下 Ctrl/Command/Shift
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault(); // 阻止默认换行
      handleSend();
    }
  };

  // 滚动到底部的函数
  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  // 初始加载时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, []);

  // 当消息列表更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={styles.container}>
      <div ref={messageListRef} className={styles.messageList}>
        {renderMessageList()}
      </div>

      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          {uploadedImages.length > 0 && (
            <div className={styles.imagePreviewArea}>
              {uploadedImages.map((img, index) => (
                <div key={img.imageId} className={styles.imagePreviewItem}>
                  <img src={img.previewUrl} alt="预览图" />
                  <div
                    className={styles.removeImageBtn}
                    onClick={() => {
                      setUploadedImages((prev) =>
                        prev.filter((_, i) => i !== index)
                      );
                    }}
                  >
                    <CloseOutlined />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className={styles.textInputArea}>
            <Input.TextArea
              className={styles.textArea}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={handleKeyPress}
              placeholder={
                propData.placeholder ||
                "Press Enter to send, Shift+Enter for new line"
              }
              autoSize={{ minRows: 1, maxRows: 4 }}
              variant="borderless"
            />

            <div className={styles.inputActions}>
              <Upload
                showUploadList={false}
                beforeUpload={() => false}
                onChange={handleFileChange}
                accept="image/*"
                multiple={false}
              >
                <Button
                  type="text"
                  icon={<PictureOutlined />}
                  className={styles.uploadButton}
                />
              </Upload>

              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                className={styles.sendButton}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatRoom = (props: ChatRoomProps) => {
  const context = useAppContext();
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        const apolloClient =
          await context?.component?.engine?.systemInterface?.getApolloClient();
        if (apolloClient) {
          setClient(apolloClient);
        }
      } catch (error) {
        console.error("Failed to get Apollo Client:", error);
      }
    };

    if (context?.component?.engine?.systemInterface) {
      initClient();
    }
  }, [context]);

  if (!client) return null;

  return <ChatRoomInner {...props} apolloClient={client} />;
};
