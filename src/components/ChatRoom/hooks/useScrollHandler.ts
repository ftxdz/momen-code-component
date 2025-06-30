import { useState, useCallback, useRef } from 'react';

// 滚动处理Hook的返回值类型
export interface UseScrollHandlerReturn {
  messageListRef: React.RefObject<HTMLDivElement>;
  isUserScrolledUp: boolean;
  hasNewMessages: boolean;
  scrollToBottom: () => void;
  scrollToBottomAndClearReminder: () => void;
  setIsUserScrolledUp: (scrolled: boolean) => void;
  setHasNewMessages: (hasNew: boolean) => void;
  handleScroll: () => void;
}

/**
 * 滚动处理Hook
 * 负责处理消息列表的滚动逻辑、新消息提醒、自动滚动等功能
 */
export const useScrollHandler = (
  isStreaming: boolean,
  streamingMessageTemp: any
): UseScrollHandlerReturn => {
  // 滚动相关状态
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  
  const messageListRef = useRef<HTMLDivElement>(null);
  
  // 使用ref来存储最新的状态，避免依赖项变化导致函数重新创建
  const isStreamingRef = useRef(isStreaming);
  const streamingMessageTempRef = useRef(streamingMessageTemp);
  
  // 同步ref中的状态
  isStreamingRef.current = isStreaming;
  streamingMessageTempRef.current = streamingMessageTemp;

  /**
   * 滚动到底部的函数
   */
  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, []);

  /**
   * 检测用户是否向上滚动
   * 优化：使用ref获取最新状态，避免依赖项变化导致函数重新创建
   */
  const handleScroll = useCallback(() => {
    if (messageListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50; // 增加容错范围到50px
      const wasScrolledUp = isUserScrolledUp;
      const newIsScrolledUp = !isAtBottom;
      
      // 使用ref获取最新状态，避免依赖项变化
      const currentIsStreaming = isStreamingRef.current;
      const currentStreamingMessageTemp = streamingMessageTempRef.current;
      
      console.log('滚动检测:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        isAtBottom,
        wasScrolledUp,
        newIsScrolledUp,
        isStreaming: currentIsStreaming,
        hasStreamingMessage: !!currentStreamingMessageTemp,
        streamingContentLength: currentStreamingMessageTemp?.content?.length || 0
      });
      
      // 只有在状态真正改变时才更新，避免不必要的重新渲染
      if (newIsScrolledUp !== isUserScrolledUp) {
        setIsUserScrolledUp(newIsScrolledUp);
      }
      
      // 如果用户滚动到底部，清除新消息提醒
      if (isAtBottom) {
        setHasNewMessages(false);
        console.log('用户在底部，隐藏新消息提醒');
      }
    }
  }, [isUserScrolledUp]); // 移除scrollToBottom依赖，避免不必要的重新创建

  /**
   * 滚动到底部并清除提醒
   */
  const scrollToBottomAndClearReminder = useCallback(() => {
    scrollToBottom();
    setHasNewMessages(false);
    // 新增：点击按钮滚动到底部后，恢复自动滚动
    setIsUserScrolledUp(false);
  }, [scrollToBottom]);

  return {
    messageListRef,
    isUserScrolledUp,
    hasNewMessages,
    scrollToBottom,
    scrollToBottomAndClearReminder,
    setIsUserScrolledUp,
    setHasNewMessages,
    handleScroll,
  };
}; 