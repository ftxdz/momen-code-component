import { useState, useCallback, useRef, useMemo } from 'react';
import { Message } from '../types';

// 流式消息临时数据结构
export interface StreamingMessageTemp {
  id: string;
  type: 'reasoning' | 'result';
  content: string;
  timestamp: string;
}

// 流式消息Hook的返回值类型
export interface UseStreamingMessageReturn {
  streamingMessageTemp: StreamingMessageTemp | null;
  isStreaming: boolean;
  streamingContentRef: React.MutableRefObject<string>;
  streamingIdRef: React.MutableRefObject<string>;
  streamingMessageTempRef: React.MutableRefObject<StreamingMessageTemp | null>;
  setIsStreaming: (streaming: boolean) => void;
  handleStreamingData: (data: string, type: 'reasoning' | 'result') => void;
  mostSafeStreamingDataHandler: (data: string, type: 'reasoning' | 'result') => Promise<void>;
  clearStreamingData: () => void;
  debouncedHandleStreamingData: (data: string, type: 'reasoning' | 'result') => void;
  convertToFinalMessage: (assistantImageUrl?: string) => Message | null;
}

/**
 * 流式消息处理Hook
 * 负责处理流式消息的状态管理、内容累加、防抖等功能
 */
export const useStreamingMessage = (): UseStreamingMessageReturn => {
  // 流式消息相关状态
  const [streamingMessageTemp, setStreamingMessageTemp] = useState<StreamingMessageTemp | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // 使用useRef来存储临时消息内容，避免状态更新竞态条件
  const streamingContentRef = useRef<string>('');
  const streamingIdRef = useRef<string>('');
  const streamingMessageTempRef = useRef<StreamingMessageTemp | null>(null);

  // 使用useMemo来稳定streamingMessageTemp的引用，避免不必要的重新渲染
  const stableStreamingMessageTemp = useMemo(() => streamingMessageTemp, [
    streamingMessageTemp?.id,
    streamingMessageTemp?.content?.length
  ]);

  /**
   * 处理流式数据的回调函数
   * @param data 流式数据内容
   * @param type 数据类型：reasoning(推理) 或 result(结果)
   */
  const handleStreamingData = useCallback((data: string, type: 'reasoning' | 'result') => {
    setStreamingMessageTemp((prev) => {
      if (!prev) {
        // 如果没有临时消息，创建新的
        const newId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('创建新的临时流式消息:', data, 'ID:', newId);
        const newTemp = {
          id: newId,
          type,
          content: data,
          timestamp: new Date().toISOString(),
        };
        // 同步更新ref
        streamingMessageTempRef.current = newTemp;
        streamingContentRef.current = data;
        streamingIdRef.current = newId;
        return newTemp;
      } else {
        // 如果已有临时消息，累加内容，保持ID不变
        const updatedContent = prev.content + data;
        console.log('累加流式内容:', data, '当前总内容长度:', updatedContent.length, 'ID:', prev.id);
        const updatedTemp = {
          ...prev,
          content: updatedContent,
        };
        // 同步更新ref
        streamingMessageTempRef.current = updatedTemp;
        streamingContentRef.current = updatedContent;
        return updatedTemp;
      }
    });
  }, []);

  /**
   * 最安全的流式数据处理函数（使用Promise确保状态更新）
   * @param data 流式数据内容
   * @param type 数据类型
   * @returns Promise<void>
   */
  const mostSafeStreamingDataHandler = useCallback((data: string, type: 'reasoning' | 'result') => {
    console.log('最安全处理流式数据:', data, '类型:', type);
    
    return new Promise<void>((resolve) => {
      setStreamingMessageTemp(prev => {
        let newState;
        if (!prev) {
          const newId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          streamingIdRef.current = newId;
          streamingContentRef.current = data;
          newState = {
            id: newId,
            type,
            content: data,
            timestamp: new Date().toISOString(),
          };
        } else {
          const updatedContent = prev.content + data;
          streamingContentRef.current = updatedContent;
          newState = {
            ...prev,
            content: updatedContent,
          };
        }
        // 同步ref
        streamingMessageTempRef.current = newState;
        // 使用requestAnimationFrame确保状态更新完成
        requestAnimationFrame(() => resolve());
        return newState;
      });
    });
  }, []);

  /**
   * 清除流式数据的函数
   */
  const clearStreamingData = useCallback(() => {
    console.log('清除流式数据');
    setStreamingMessageTemp(null);
    // 延迟清空ref，确保state已同步
    requestAnimationFrame(() => {
      streamingContentRef.current = '';
      streamingIdRef.current = '';
      streamingMessageTempRef.current = null;
    });
  }, []);

  /**
   * 防抖的流式数据处理函数（仅用于UI优化，不用于关键数据）
   */
  const debouncedHandleStreamingData = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      let pendingData: string[] = [];
      let pendingType: 'reasoning' | 'result' = 'result';
      
      return (data: string, type: 'reasoning' | 'result') => {
        // 收集待处理的数据
        pendingData.push(data);
        pendingType = type;
        
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          // 合并所有待处理的数据
          const combinedData = pendingData.join('');
          console.log('防抖处理合并数据:', combinedData, '类型:', pendingType);
          handleStreamingData(combinedData, pendingType);
          
          // 清空待处理数据
          pendingData = [];
        }, 16); // 约60fps的更新频率
      };
    })(),
    [handleStreamingData]
  );

  /**
   * 将临时流式消息转换为正式消息
   * @param assistantImageUrl 助手头像URL
   * @returns Message | null
   */
  const convertToFinalMessage = useCallback((assistantImageUrl?: string): Message | null => {
    const finalContent = streamingContentRef.current;
    if (!finalContent) return null;

    console.log('将临时消息转换为正式消息，内容长度:', finalContent.length);
    const finalMessage: Message = {
      id: Date.now(),
      sender_id: 0,
      sender: "assistant",
      sender_avatar: assistantImageUrl || "",
      contents: [{
        id: Date.now(),
        type: "TEXT",
        text: finalContent,
        image: null,
      }],
      created_at: new Date().toISOString(),
    };

    return finalMessage;
  }, []);

  return {
    streamingMessageTemp: stableStreamingMessageTemp,
    isStreaming,
    streamingContentRef,
    streamingIdRef,
    streamingMessageTempRef,
    setIsStreaming,
    handleStreamingData,
    mostSafeStreamingDataHandler,
    clearStreamingData,
    debouncedHandleStreamingData,
    convertToFinalMessage,
  };
}; 