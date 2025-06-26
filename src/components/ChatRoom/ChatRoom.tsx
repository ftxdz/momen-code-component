import { Input, Button, Upload, Modal } from "antd";
import type { UploadFile, UploadChangeParam } from "antd/es/upload/interface";
import styles from "./ChatRoom.module.css";
import {
  SendOutlined,
  PictureOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { GQL_IMAGE_PRESIGNED_URL, GQL_SEND_MESSAGE } from "./graphQL/zai";
import { GQL_SUBSCRIPTION_FOR_CONVERSATION, GQL_SUBSCRIPTION_FOR_CONVERSATION_STATUS } from "./graphQL/zai/subscription";
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
import { Message, MessageContent, UploadedImage, ConversationStatus, ConversationStatusData, StreamingMessageTemp } from "./types";

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
  
  // 新增：状态订阅相关状态
  const [streamingMessageTemp, setStreamingMessageTemp] = useState<StreamingMessageTemp | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  
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

  // 新增：处理流式数据的回调函数
  const handleStreamingData = useCallback((data: string, type: 'reasoning' | 'result') => {
    setStreamingMessageTemp((prev) => {
      if (!prev) {
        // 如果没有临时消息，创建新的
        return {
          id: `temp-${Date.now()}`,
          type,
          content: data,
          timestamp: new Date().toISOString(),
        };
      } else {
        // 如果已有临时消息，累加内容
        return {
          ...prev,
          content: prev.content + data,
        };
      }
    });
  }, []);

  const showError = (errorMessage: string) => {
    Modal.error({
      title: "Error",
      content: errorMessage,
    });
  };

  useEffect(() => {
    // 消息订阅
    const messageSubscription = apolloClient.subscribe({
      query: isMomenAI
        ? GQL_SUBSCRIPTION_FOR_CONVERSATION
        : GQL_SUBSCRIPTION_FOR_CHATMESSAGE,
      variables: { conversationId: propData.conversationId },
    });

    const messageSubscriber = messageSubscription.subscribe({
      next: ({ data, errors }: { data?: any; errors?: any[] }) => {
        if (errors) {
          showError(errors[0]?.message || "Failed to subscribe to messages");
          return;
        }

        if (isMomenAI && data?.fz_streaming_fz_message) {
          updateMessages(data.fz_streaming_fz_message);
          // 当收到具体消息时，清除临时消息
          setStreamingMessageTemp(null);
        } else if (!isMomenAI && data?.chatroom_message) {
          const message = transformChatroomMessages(data.chatroom_message);
          updateMessages(message);
        }
      },
      error: async(error: Error) => {
        console.error("Message subscription error:", error);
        showError(error.message || "Failed to subscribe to messages");
        await propState.subscribeMessageError?.set(
          error.message || "Failed to subscribe to messages"
        );
        setTimeout(() => {
          event.onSubscribeMessageError?.call(null);
        });
      },
    });

    // 新增：状态订阅（仅对MomenAI模式启用）
    let statusSubscriber: any = null;
    if (isMomenAI) {
      const statusSubscription = apolloClient.subscribe({
        query: GQL_SUBSCRIPTION_FOR_CONVERSATION_STATUS,
        variables: { conversationId: propData.conversationId },
      });

      statusSubscriber = statusSubscription.subscribe({
        next: ({ data, errors }: { data?: any; errors?: any[] }) => {
          if (errors) {
            console.error("Status subscription errors:", errors);
            return;
          }

          if (data?.fz_zai_listen_conversation_result) {
            const result: ConversationStatusData = data.fz_zai_listen_conversation_result;
            setIsStreaming(result.status === ConversationStatus.STREAMING);
            
            // 处理流式状态
            if (result.status === ConversationStatus.STREAMING) {
              // 处理推理内容（累加显示）
              if (result.reasoningContent) {
                handleStreamingData(result.reasoningContent, 'reasoning');
              }
              
              // 处理结果数据（累加显示）
              if (result.data) {
                handleStreamingData(result.data, 'result');
              }
            } else {
              // 当状态不是流式时，清除临时消息
              setStreamingMessageTemp(null);
            }
            
            // 处理失败状态
            if (result.status === ConversationStatus.FAILED) {
              const errorMessage = result.data || "对话处理失败";
              showError(errorMessage);
            }
          }
        },
        error: (error: Error) => {
          console.error("Status subscription error:", error);
          // 状态订阅错误不影响主要功能，只记录日志
        },
      });
    }

    return () => {
      messageSubscriber.unsubscribe();
      if (statusSubscriber) {
        statusSubscriber.unsubscribe();
      }
    };
  }, [apolloClient, propData.conversationId, isMomenAI]);

  // 发送消息处理
    const handleSend = async () => {
    const hasText = inputValue.trim().length > 0;
    const hasImages = uploadedImages.length > 0;

    if (!hasText && !hasImages) return;

    // 新增：检查是否正在流式处理中
    if (isStreaming) {
      showError("正在处理中，请稍后再试");
      return;
    }

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
    const allMessages = [...messages];
    
    // 新增：如果有临时流式消息，添加到列表末尾
    if (streamingMessageTemp && isMomenAI) {
      const tempMessage: Message = {
        id: parseInt(streamingMessageTemp.id),
        sender_id: 0,
        sender: "assistant",
        sender_avatar: propData.assistantImageUrl || "",
        contents: [{
          id: parseInt(streamingMessageTemp.id),
          type: "TEXT",
          text: streamingMessageTemp.content,
          image: null,
        }],
        created_at: streamingMessageTemp.timestamp,
      };
      allMessages.push(tempMessage);
    }

    return allMessages.map((message, index) => {
      const previousMessage = index > 0 ? allMessages[index - 1] : null;
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

      // 新增：为临时流式消息添加特殊样式
      const isTempMessage = streamingMessageTemp && message.id === parseInt(streamingMessageTemp.id);

      return (
        <React.Fragment key={`${message.id}-${index}`}>
          {showTime && renderTimeDiv(message.created_at)}
          <div
            className={`${styles.messageItem} ${
              isUser ? styles.userMessage : styles.assistantMessage
            } ${isTempMessage ? styles.tempMessage : ''}`}
          >
            {avatarUrl && (
              <img src={avatarUrl} alt={"Avatar"} className={styles.avatar} />
            )}
            <div className={styles.messageContent}>
              {message.contents?.map((content, contentIndex) =>
                renderMessageContent(content, contentIndex, message.created_at)
              )}
              {/* 新增：为临时消息添加加载指示器 */}
              {isTempMessage && isStreaming && !streamingMessageTemp?.content && (
                <div className={styles.streamingIndicator}>
                  <span className={styles.typingDots}>正在思考中...</span>
                </div>
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
              disabled={isStreaming}
            />

            <div className={styles.inputActions}>
              <Upload
                showUploadList={false}
                beforeUpload={() => false}
                onChange={handleFileChange}
                accept="image/*"
                multiple={false}
                disabled={isStreaming}
              >
                <Button
                  type="text"
                  icon={<PictureOutlined />}
                  className={styles.uploadButton}
                  disabled={isStreaming}
                />
              </Upload>

              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                className={styles.sendButton}
                disabled={isStreaming}
                loading={isStreaming}
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
           context?.component?.engine?.systemInterface?.getApolloClient();
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
