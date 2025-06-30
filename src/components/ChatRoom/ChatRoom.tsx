import { Input, Button, Upload, Modal } from "antd";
import styles from "./ChatRoom.module.css";
import {
  SendOutlined,
  PictureOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { GQL_SEND_MESSAGE } from "./graphQL/zai";
import { GQL_SUBSCRIPTION_FOR_CONVERSATION, GQL_SUBSCRIPTION_FOR_CONVERSATION_STATUS } from "./graphQL/zai/subscription";
import { GQL_SUBSCRIPTION_FOR_CHATMESSAGE } from "./config/graphQL/subscription";
import { GQL_SEND_CHATROOM_MESSAGE } from "./config/graphQL/index";
import { useState, useEffect, useCallback } from "react";
import { useAppContext, EventHandler, State } from "zvm-code-context";

import { transformChatroomMessages } from "./config/messageTransformer";
import { buildChatroomMessageObjects } from "./config/messageBuilder";
import { Message, ConversationStatus, ConversationStatusData } from "./types";

// 导入自定义hooks
import { 
  useStreamingMessage, 
  useScrollHandler, 
  useFileUpload 
} from "./hooks";

// 导入组件
import { MessageRenderer } from "./components";

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
  
  const { query } = useAppContext();

  // 使用自定义hooks
  const {
    streamingMessageTemp,
        isStreaming,
    setIsStreaming,
    mostSafeStreamingDataHandler,
    clearStreamingData,
  } = useStreamingMessage();

  const {
    messageListRef,
    isUserScrolledUp,
    hasNewMessages,
    scrollToBottom,
    scrollToBottomAndClearReminder,
    setHasNewMessages,
    handleScroll,
  } = useScrollHandler(isStreaming, streamingMessageTemp);

  const {
    uploadedImages,
    handleFileChange,
    removeImage,
    clearImages,
  } = useFileUpload();

  // 新增：跟踪是否是初始加载
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 新增：检查用户是否在底部的辅助函数，带容错机制
  const checkUserAtBottom = useCallback(() => {
    if (!messageListRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
    // 增加容错范围到50px，确保用户接近底部时也能被正确识别
    return scrollTop + clientHeight >= scrollHeight - 50;
  }, []);

  // 新增：检查用户是否向上滚动的辅助函数，带容错机制
  const checkUserScrolledUp = useCallback(() => {
    return !checkUserAtBottom();
  }, [checkUserAtBottom]);

  const updateMessages = useCallback((messageData: Message | Message[]) => {
    console.log('updateMessages 被调用:', messageData);
    setMessages((prevMessages) => {
      const newMessages = Array.isArray(messageData)
        ? messageData
        : [messageData];

      const uniqueNewMessages = newMessages.filter(
        (newMsg: Message) =>
          !prevMessages.some((existingMsg) => existingMsg.id === newMsg.id)
      );

      console.log('过滤后的新消息:', uniqueNewMessages);
      
      // 使用新的带容错的底部判断函数
      const currentIsUserScrolledUp = checkUserScrolledUp();
      
      console.log('当前用户滚动状态:', currentIsUserScrolledUp);

      if (uniqueNewMessages.length === 0) {
        console.log('没有新消息，返回原消息列表');
        return prevMessages;
      }

      // 注意：新消息提醒的逻辑已经在消息订阅中处理，这里不再重复设置
      const updatedMessages = [...prevMessages, ...uniqueNewMessages];
      console.log('更新后的消息列表长度:', updatedMessages.length);
      return updatedMessages;
    });
    
    // 根据用户位置决定是否自动滚动 - 用户不在底部时不自动滚动
    const currentIsUserScrolledUp = checkUserScrolledUp();
    
    if (!currentIsUserScrolledUp) {
      console.log('updateMessages: 用户在底部，自动滚动到底部');
      scrollToBottom();
    } else {
      console.log('updateMessages: 用户向上滚动，不自动滚动，保持用户当前位置');
      // 用户不在底部时，不自动滚动，保持用户当前滚动位置
    }
  }, [scrollToBottom, checkUserScrolledUp]); // 添加checkUserScrolledUp依赖

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
          console.log('收到流式消息:', data.fz_streaming_fz_message);
          
          // 新增：在更新消息前检查用户位置，决定是否显示新消息提醒
          const currentIsUserScrolledUp = checkUserScrolledUp();
          
          if (currentIsUserScrolledUp) {
            console.log('收到订阅消息：用户不在底部，显示新消息提醒，不自动滚动');
            setHasNewMessages(true);
            // 用户不在底部时，直接更新消息列表，不调用updateMessages的自动滚动
            setMessages((prevMessages) => {
              const newMessages = Array.isArray(data.fz_streaming_fz_message)
                ? data.fz_streaming_fz_message
                : [data.fz_streaming_fz_message];
              
              const uniqueNewMessages = newMessages.filter(
                (newMsg: Message) =>
                  !prevMessages.some((existingMsg) => existingMsg.id === newMsg.id)
              );
              
              if (uniqueNewMessages.length === 0) {
                return prevMessages;
              }
              
              const updatedMessages = [...prevMessages, ...uniqueNewMessages];
              console.log('直接更新消息列表，保持用户滚动位置，消息数量:', updatedMessages.length);
              return updatedMessages;
            });
          } else {
            console.log('收到订阅消息：用户在底部，不显示提醒，自动滚动');
            setHasNewMessages(false);
            // 用户在底部时，使用updateMessages的自动滚动功能
            updateMessages(data.fz_streaming_fz_message);
          }
          
          // 当收到具体消息时，清除临时消息
          // 新增：延迟清除临时消息，确保内容不会丢失
          setTimeout(() => {
            console.log('延迟清除临时消息');
            clearStreamingData();
          }, 100);
        } else if (!isMomenAI && data?.chatroom_message) {
          const message = transformChatroomMessages(data.chatroom_message);
          
          // 新增：非MomenAI模式也检查用户位置
          const currentIsUserScrolledUp = checkUserScrolledUp();
          
          if (currentIsUserScrolledUp) {
            console.log('收到聊天消息：用户不在底部，显示新消息提醒');
            setHasNewMessages(true);
          } else {
            console.log('收到聊天消息：用户在底部，不显示提醒');
            setHasNewMessages(false);
          }
          
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
            console.log('状态订阅收到数据:', result, '用户向上滚动:', isUserScrolledUp);
            setIsStreaming(result.status === ConversationStatus.STREAMING);
            
            // 处理流式状态
            if (result.status === ConversationStatus.STREAMING) {
              console.log('状态订阅：收到STREAMING状态');
              
              // 检查用户是否向上滚动，如果是则显示新消息提醒
              const currentIsUserScrolledUp = checkUserScrolledUp();
              
              if (currentIsUserScrolledUp) {
                console.log('状态订阅：用户向上滚动，显示新消息提醒');
                setHasNewMessages(true);
              } else {
                console.log('状态订阅：用户在底部，立即滚动到底部');
                // 使用requestAnimationFrame确保DOM更新后再滚动
                requestAnimationFrame(() => {
                  scrollToBottom();
                });
              }
              
              // 处理推理内容（累加显示）
              if (result.reasoningContent) {
                mostSafeStreamingDataHandler(result.reasoningContent, 'reasoning');
              }
              
              // 处理结果数据（累加显示）
              if (result.data) {
                mostSafeStreamingDataHandler(result.data, 'result');
              }
            } else if (
              result.status === ConversationStatus.COMPLETED ||
              result.status === ConversationStatus.FAILED ||
              result.status === ConversationStatus.CANCELED
            ) {
              // 只有对话真正结束、失败或被取消时才清空
              clearStreamingData();
              
              // 新增：流式消息结束时，不自动滚动，保持用户当前滚动位置
              console.log('流式消息结束，状态:', result.status, '保持用户当前滚动位置');
            }
            
            // 新增：无论什么状态，只要有流式消息内容进来，都要检查用户位置
            if (result.reasoningContent || result.data) {
              const currentIsUserScrolledUp = checkUserScrolledUp();
              
              if (currentIsUserScrolledUp) {
                console.log('状态订阅：有流式消息内容，用户不在底部，显示新消息提醒');
                setHasNewMessages(true);
              } else {
                console.log('状态订阅：有流式消息内容，用户在底部，不显示提醒');
                setHasNewMessages(false);
              }
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

    // 新增：防重复提交检查
    if (isStreaming) {
      console.log('正在处理中，阻止重复提交');
      return;
    }

    try {
      // 新增：立即设置流式状态，防止重复提交
      setIsStreaming(true);
      
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
          // 新增：错误时重置流式状态
          setIsStreaming(false);
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
          // 新增：错误时重置流式状态
          setIsStreaming(false);
          return;
        }
      }

      setInputValue("");
      clearImages();
      
      // 用户发送消息后自动滚动到底部
      console.log('用户发送消息，自动滚动到底部');
      scrollToBottom();
      
      event.onSendMessageSuccess?.call(null);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      await propState.sendMessageError?.set(
        error.message || "Failed to send message"
      );
      setTimeout(() => {
        event.onSendMessageError?.call(null);
      });
      // 新增：错误时重置流式状态
      setIsStreaming(false);
    }
  };

  // 处理按键事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 如果按下回车键，但没有按下 Ctrl/Command/Shift
    if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault(); // 阻止默认换行
      
      // 新增：防重复提交检查
      if (isStreaming) {
        console.log('正在处理中，阻止键盘重复提交');
        return;
      }
      
      handleSend();
    }
  };

  // 初始加载时滚动到底部
  useEffect(() => {
    // 使用setTimeout和requestAnimationFrame确保DOM完全渲染后再滚动
    const timeoutId = setTimeout(() => {
      const frameId = requestAnimationFrame(() => {
        console.log('初始加载：滚动到列表最底部');
        scrollToBottom();
      });
      
      return () => cancelAnimationFrame(frameId);
    }, 100); // 延迟100ms确保内容渲染完成
    
    return () => clearTimeout(timeoutId);
  }, [scrollToBottom]); // 添加scrollToBottom依赖

  // 当消息列表有内容时，确保滚动到底部（仅在初始加载时）
  useEffect(() => {
    if (messages.length > 0 && !isStreaming && isInitialLoad) {
      // 使用setTimeout和requestAnimationFrame确保DOM完全渲染后再滚动
      const timeoutId = setTimeout(() => {
        const frameId = requestAnimationFrame(() => {
          console.log('初始消息列表有内容：滚动到列表最底部，消息数量:', messages.length);
          scrollToBottom();
          // 初始加载完成后，设置为false
          setIsInitialLoad(false);
        });
        
        return () => cancelAnimationFrame(frameId);
      }, 50); // 延迟50ms确保消息内容渲染完成
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length === 0 ? null : messages.length, isStreaming, isInitialLoad, scrollToBottom]); // 添加isInitialLoad依赖

  // 当消息列表更新时，由updateMessages函数控制滚动
  useEffect(() => {
    console.log('消息列表更新，由updateMessages函数控制滚动');
  }, [messages]); // 移除isUserScrolledUp和scrollToBottom依赖，避免不必要的重新执行

  // 新增：优化的流式消息滚动处理逻辑
  useEffect(() => {
    if (!isStreaming) return;
    const currentIsUserScrolledUp = checkUserScrolledUp();
    if (!currentIsUserScrolledUp) {
      console.log('流式消息：用户在底部，自动滚动到底部');
      scrollToBottom();
      setHasNewMessages(false); // 用户在底部，确保不显示提醒
    } else {
      console.log('流式消息：用户向上滚动，不自动滚动，显示提醒');
      setHasNewMessages(true);
    }
  }, [isStreaming, scrollToBottom, checkUserScrolledUp]); // 添加checkUserScrolledUp依赖

  // 新增：流式消息内容更新时的滚动处理
  useEffect(() => {
    if (!streamingMessageTemp || !isStreaming) return;
    const currentIsUserScrolledUp = checkUserScrolledUp();
    if (!currentIsUserScrolledUp) {
      console.log('流式消息内容更新：用户在底部，自动滚动到底部');
      scrollToBottom();
      setHasNewMessages(false); // 用户在底部，确保不显示提醒
    } else {
      console.log('流式消息内容更新：用户向上滚动，不自动滚动，显示提醒');
      setHasNewMessages(true);
    }
  }, [streamingMessageTemp?.content, isStreaming, scrollToBottom, checkUserScrolledUp]); // 添加checkUserScrolledUp依赖

  // 新增：流式消息结束时的处理
  useEffect(() => {
    if (isStreaming) return; // 只在流式消息结束时执行
    
    // 流式消息结束时，不自动滚动，保持用户当前滚动位置
    console.log('流式消息结束，保持用户当前滚动位置，不进行任何滚动操作');
    
    // 检查用户是否在底部，如果不在底部则显示新消息提醒
    const currentIsUserScrolledUp = checkUserScrolledUp();
    
    if (currentIsUserScrolledUp) {
      console.log('流式消息结束：用户不在底部，显示新消息提醒，不滚动');
      setHasNewMessages(true);
    } else {
      console.log('流式消息结束：用户在底部，不显示提醒，不滚动');
      setHasNewMessages(false);
    }
  }, [isStreaming, checkUserScrolledUp]); // 添加checkUserScrolledUp依赖

  return (
    <div className={styles.container}>
      <div 
        ref={messageListRef} 
        className={styles.messageList}
        onScroll={handleScroll}
      >
        <MessageRenderer
          messages={messages}
          streamingMessageTemp={streamingMessageTemp}
          isMomenAI={isMomenAI}
          isStreaming={isStreaming}
          userImageUrl={propData.userImageUrl}
          assistantImageUrl={propData.assistantImageUrl}
          accountId={propData.accountId}
        />
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
                    onClick={() => removeImage(index)}
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

      {/* 新增：新消息提醒按钮 */}
      {hasNewMessages && (
        <div className={styles.newMessageReminder} onClick={scrollToBottomAndClearReminder}>
          <span>有新消息</span>
          <span className={styles.reminderArrow}>↓</span>
        </div>
      )}
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
