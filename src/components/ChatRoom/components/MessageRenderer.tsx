import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, MessageContent } from '../types';
import styles from '../ChatRoom.module.css';

// 消息渲染组件的属性类型
export interface MessageRendererProps {
  messages: Message[];
  streamingMessageTemp: any;
  isMomenAI: boolean;
  isStreaming: boolean;
  userImageUrl?: string;
  assistantImageUrl?: string;
  accountId: number;
}

/**
 * 消息渲染组件
 * 负责渲染消息列表、时间分割线、头像等功能
 */
export const MessageRenderer: React.FC<MessageRendererProps> = ({
  messages,
  streamingMessageTemp,
  isMomenAI,
  isStreaming,
  userImageUrl,
  assistantImageUrl,
  accountId,
}) => {
  /**
   * 渲染消息内容
   */
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

  /**
   * 判断是否需要显示时间
   */
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

  /**
   * 格式化时间显示
   */
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

  /**
   * 渲染时间分割线
   */
  const renderTimeDiv = (timestamp: string) => (
    <div className={styles.timeDiv}>
      <span>{formatMessageTime(timestamp)}</span>
    </div>
  );

  /**
   * 渲染消息列表
   */
  const renderMessageList = () => {
    const allMessages = [...messages];
    
    // 新增：如果有临时流式消息，添加到列表末尾
    if (streamingMessageTemp && isMomenAI) {
      const tempMessage: Message = {
        id: parseInt(streamingMessageTemp.id.replace(/\D/g, '')), // 提取数字部分作为ID
        sender_id: 0,
        sender: "assistant",
        sender_avatar: assistantImageUrl || "",
        contents: [{
          id: parseInt(streamingMessageTemp.id.replace(/\D/g, '')), // 提取数字部分作为ID
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
        avatarUrl = isUser ? userImageUrl : assistantImageUrl;
      } else {
        // 普通聊天室模式使用数据库中的头像
        isUser = message.sender_id === accountId;
        avatarUrl = message.sender_avatar;
      }

      // 新增：为临时流式消息添加特殊样式
      const isTempMessage = streamingMessageTemp && 
        message.id === parseInt(streamingMessageTemp.id.replace(/\D/g, '')) &&
        message.sender === "assistant" &&
        index === allMessages.length - 1; // 确保是最后一条消息

      return (
        <React.Fragment key={`${message.id}-${index}-${isTempMessage ? 'temp' : 'normal'}`}>
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

  return <>{renderMessageList()}</>;
}; 