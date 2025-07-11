import { Input, Button, Upload, Modal } from 'antd';
import styles from './ChatRoom.module.css';
import {
  SendOutlined,
  PictureOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { GQL_SEND_MESSAGE } from './graphQL/zai';
import {
  GQL_SUBSCRIPTION_FOR_CONVERSATION,
  GQL_SUBSCRIPTION_FOR_CONVERSATION_STATUS,
} from './graphQL/zai/subscription';
import { GQL_SUBSCRIPTION_FOR_CHATMESSAGE } from './config/graphQL/subscription';
import { GQL_SEND_CHATROOM_MESSAGE } from './config/graphQL/index';
import { useState, useEffect, useCallback } from 'react';
import { useAppContext, EventHandler, State } from 'zvm-code-context';

import { transformChatroomMessages } from './config/messageTransformer';
import { buildChatroomMessageObjects } from './config/messageBuilder';
import { Message, ConversationStatus, ConversationStatusData } from './types';

// Import custom hooks
import { useStreamingMessage, useScrollHandler, useFileUpload } from './hooks';

// Import components
import { MessageRenderer } from './components';

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
    typeof propData.isMomenAI === 'boolean'
      ? propData.isMomenAI
      : propData.isMomenAI == 'true';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  const { query } = useAppContext();

  // Use custom hooks
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

  const { uploadedImages, handleFileChange, removeImage, clearImages } =
    useFileUpload();

  // Track if it's initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Check if user is at bottom with tolerance mechanism
  const checkUserAtBottom = useCallback(() => {
    if (!messageListRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messageListRef.current;
    // Add tolerance range of 50px to ensure users near bottom are correctly identified
    return scrollTop + clientHeight >= scrollHeight - 50;
  }, []);

  // Check if user has scrolled up with tolerance mechanism
  const checkUserScrolledUp = useCallback(() => {
    return !checkUserAtBottom();
  }, [checkUserAtBottom]);

  const updateMessages = useCallback(
    (messageData: Message | Message[]) => {
      console.log('updateMessages called:', messageData);
      setMessages((prevMessages) => {
        const newMessages = Array.isArray(messageData)
          ? messageData
          : [messageData];

        const uniqueNewMessages = newMessages.filter(
          (newMsg: Message) =>
            !prevMessages.some((existingMsg) => existingMsg.id === newMsg.id)
        );

        console.log('Filtered new messages:', uniqueNewMessages);

        // Use new bottom detection function with tolerance
        const currentIsUserScrolledUp = checkUserScrolledUp();

        console.log('Current user scroll status:', currentIsUserScrolledUp);

        if (uniqueNewMessages.length === 0) {
          console.log('No new messages, return original message list');
          return prevMessages;
        }

        // Note: New message reminder logic is already handled in message subscription, no need to repeat here
        const updatedMessages = [...prevMessages, ...uniqueNewMessages];
        console.log('Updated message list length:', updatedMessages.length);
        return updatedMessages;
      });

      // Decide whether to auto-scroll based on user position - don't auto-scroll when user is not at bottom
      const currentIsUserScrolledUp = checkUserScrolledUp();

      if (!currentIsUserScrolledUp) {
        console.log('updateMessages: User at bottom, auto-scroll to bottom');
        scrollToBottom();
      } else {
        console.log(
          'updateMessages: User scrolled up, no auto-scroll, maintain user position'
        );
        // When user is not at bottom, don't auto-scroll, maintain user's current scroll position
      }
    },
    [scrollToBottom, checkUserScrolledUp]
  ); // Add checkUserScrolledUp dependency

  const showError = (errorMessage: string) => {
    Modal.error({
      title: 'Error',
      content: errorMessage,
    });
  };

  useEffect(() => {
    // Message subscription
    const messageSubscription = apolloClient.subscribe({
      query: isMomenAI
        ? GQL_SUBSCRIPTION_FOR_CONVERSATION
        : GQL_SUBSCRIPTION_FOR_CHATMESSAGE,
      variables: { conversationId: propData.conversationId },
    });

    const messageSubscriber = messageSubscription.subscribe({
      next: ({ data, errors }: { data?: any; errors?: any[] }) => {
        if (errors) {
          showError(errors[0]?.message || 'Failed to subscribe to messages');
          return;
        }

        if (isMomenAI && data?.fz_streaming_fz_message) {
          console.log(
            'Received streaming message:',
            data.fz_streaming_fz_message
          );

          // Check user position before updating messages, decide whether to show new message reminder
          const currentIsUserScrolledUp = checkUserScrolledUp();

          if (currentIsUserScrolledUp) {
            console.log(
              'Received subscription message: User not at bottom, show new message reminder, no auto-scroll'
            );
            setHasNewMessages(true);
            // When user is not at bottom, directly update message list, don't call updateMessages auto-scroll
            setMessages((prevMessages) => {
              const newMessages = Array.isArray(data.fz_streaming_fz_message)
                ? data.fz_streaming_fz_message
                : [data.fz_streaming_fz_message];

              const uniqueNewMessages = newMessages.filter(
                (newMsg: Message) =>
                  !prevMessages.some(
                    (existingMsg) => existingMsg.id === newMsg.id
                  )
              );

              if (uniqueNewMessages.length === 0) {
                return prevMessages;
              }

              const updatedMessages = [...prevMessages, ...uniqueNewMessages];
              console.log(
                'Directly update message list, maintain user scroll position, message count:',
                updatedMessages.length
              );
              return updatedMessages;
            });
          } else {
            console.log(
              'Received subscription message: User at bottom, no reminder, auto-scroll'
            );
            setHasNewMessages(false);
            // When user is at bottom, use updateMessages auto-scroll function
            updateMessages(data.fz_streaming_fz_message);
          }

          // When receiving specific messages, clear temporary messages
          // Delay clearing temporary messages to ensure content is not lost
          setTimeout(() => {
            console.log('Delayed clearing temporary messages');
            clearStreamingData();
          }, 100);
        } else if (!isMomenAI && data?.chatroom_message) {
          const message = transformChatroomMessages(data.chatroom_message);

          // Check user position for non-MomenAI mode as well
          const currentIsUserScrolledUp = checkUserScrolledUp();

          if (currentIsUserScrolledUp) {
            console.log(
              'Received chat message: User not at bottom, show new message reminder'
            );
            setHasNewMessages(true);
          } else {
            console.log('Received chat message: User at bottom, no reminder');
            setHasNewMessages(false);
          }

          updateMessages(message);
        }
      },
      error: async (error: Error) => {
        console.error('Message subscription error:', error);
        showError(error.message || 'Failed to subscribe to messages');
        await propState.subscribeMessageError?.set(
          error.message || 'Failed to subscribe to messages'
        );
        setTimeout(() => {
          event.onSubscribeMessageError?.call(null);
        });
      },
    });

    // Status subscription (only enabled for MomenAI mode)
    let statusSubscriber: any = null;
    if (isMomenAI) {
      const statusSubscription = apolloClient.subscribe({
        query: GQL_SUBSCRIPTION_FOR_CONVERSATION_STATUS,
        variables: { conversationId: propData.conversationId },
      });

      statusSubscriber = statusSubscription.subscribe({
        next: ({ data, errors }: { data?: any; errors?: any[] }) => {
          if (errors) {
            console.error('Status subscription errors:', errors);
            return;
          }

          if (data?.fz_zai_listen_conversation_result) {
            const result: ConversationStatusData =
              data.fz_zai_listen_conversation_result;
            console.log(
              'Status subscription received data:',
              result,
              'User scrolled up:',
              isUserScrolledUp
            );
            setIsStreaming(result.status === ConversationStatus.STREAMING);

            // Handle streaming status
            if (result.status === ConversationStatus.STREAMING) {
              console.log('Status subscription: Received STREAMING status');

              // Check if user has scrolled up, if so show new message reminder
              const currentIsUserScrolledUp = checkUserScrolledUp();

              if (currentIsUserScrolledUp) {
                console.log(
                  'Status subscription: User scrolled up, show new message reminder'
                );
                setHasNewMessages(true);
              } else {
                console.log(
                  'Status subscription: User at bottom, scroll to bottom immediately'
                );
                // Use requestAnimationFrame to ensure DOM is updated before scrolling
                requestAnimationFrame(() => {
                  scrollToBottom();
                });
              }

              // Handle reasoning content (accumulative display)
              if (result.reasoningContent) {
                mostSafeStreamingDataHandler(
                  result.reasoningContent,
                  'reasoning'
                );
              }

              // Handle result data (accumulative display)
              if (result.data) {
                mostSafeStreamingDataHandler(result.data, 'result');
              }
            } else if (
              result.status === ConversationStatus.COMPLETED ||
              result.status === ConversationStatus.FAILED ||
              result.status === ConversationStatus.CANCELED
            ) {
              // Only clear when conversation truly ends, fails, or is canceled
              clearStreamingData();

              // Streaming message ended, don't auto-scroll, maintain user's current scroll position
              console.log(
                'Streaming message ended, status:',
                result.status,
                'maintain user current scroll position'
              );
            }

            // Regardless of status, if there's streaming message content coming in, check user position
            if (result.reasoningContent || result.data) {
              const currentIsUserScrolledUp = checkUserScrolledUp();

              if (currentIsUserScrolledUp) {
                console.log(
                  'Status subscription: Has streaming message content, user not at bottom, show new message reminder'
                );
                setHasNewMessages(true);
              } else {
                console.log(
                  'Status subscription: Has streaming message content, user at bottom, no reminder'
                );
                setHasNewMessages(false);
              }
            }

            // Handle failed status
            if (result.status === ConversationStatus.FAILED) {
              const errorMessage =
                result.data || 'Conversation processing failed';
              showError(errorMessage);
            }
          }
        },
        error: (error: Error) => {
          console.error('Status subscription error:', error);
          // Status subscription errors don't affect main functionality, just log
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

  // Send message handling
  const handleSend = async () => {
    const hasText = inputValue.trim().length > 0;
    const hasImages = uploadedImages.length > 0;

    if (!hasText && !hasImages) return;

    // Check if currently processing streaming
    if (isStreaming) {
      showError('Processing in progress, please try again later');
      return;
    }

    // Prevent duplicate submission check
    if (isStreaming) {
      console.log('Currently processing, prevent duplicate submission');
      return;
    }

    try {
      // Immediately set streaming status to prevent duplicate submission
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
            'Failed to send message';
          await propState.sendMessageError?.set(errorMessage);
          setTimeout(() => {
            event.onSendMessageError?.call(null);
          });
          // Reset streaming status on error
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
            'Failed to send message';
          console.error('Failed to send message:', errorMessage);
          await propState.sendMessageError?.set(errorMessage);
          setTimeout(() => {
            event.onSendMessageError?.call(null);
          });
          // Reset streaming status on error
          setIsStreaming(false);
          return;
        }
      }

      setInputValue('');
      clearImages();

      // Auto scroll to bottom after user sends message
      console.log('User sent a message, auto-scroll to bottom');
      scrollToBottom();

      event.onSendMessageSuccess?.call(null);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      await propState.sendMessageError?.set(
        error.message || 'Failed to send message'
      );
      setTimeout(() => {
        event.onSendMessageError?.call(null);
      });
      // Reset streaming status on error
      setIsStreaming(false);
    }
  };

  // Handle key press event
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Enter is pressed without Ctrl/Command/Shift
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      e.preventDefault(); // Prevent default newline

      // Prevent duplicate submission by keyboard
      if (isStreaming) {
        console.log(
          'Currently processing, prevent duplicate keyboard submission'
        );
        return;
      }

      handleSend();
    }
  };

  // Scroll to bottom on initial load
  useEffect(() => {
    // Use setTimeout and requestAnimationFrame to ensure DOM is fully rendered before scrolling
    const timeoutId = setTimeout(() => {
      const frameId = requestAnimationFrame(() => {
        console.log('Initial load: scroll to bottom of list');
        scrollToBottom();
      });

      return () => cancelAnimationFrame(frameId);
    }, 100); // Delay 100ms to ensure content is rendered

    return () => clearTimeout(timeoutId);
  }, [scrollToBottom]); // Add scrollToBottom dependency

  // When message list has content, ensure scroll to bottom (only on initial load)
  useEffect(() => {
    if (messages.length > 0 && !isStreaming && isInitialLoad) {
      // Use setTimeout and requestAnimationFrame to ensure DOM is fully rendered before scrolling
      const timeoutId = setTimeout(() => {
        const frameId = requestAnimationFrame(() => {
          console.log(
            'Initial message list has content: scroll to bottom of list, message count:',
            messages.length
          );
          scrollToBottom();
          // After initial load, set to false
          setIsInitialLoad(false);
        });

        return () => cancelAnimationFrame(frameId);
      }, 50); // Delay 50ms to ensure message content is rendered

      return () => clearTimeout(timeoutId);
    }
  }, [
    messages.length === 0 ? null : messages.length,
    isStreaming,
    isInitialLoad,
    scrollToBottom,
  ]); // Add isInitialLoad dependency

  // When message list updates, scroll is controlled by updateMessages function
  useEffect(() => {
    console.log(
      'Message list updated, scroll controlled by updateMessages function'
    );
  }, [messages]); // Remove isUserScrolledUp and scrollToBottom dependencies to avoid unnecessary re-execution

  // Optimized streaming message scroll handling logic
  useEffect(() => {
    if (!isStreaming) return;
    const currentIsUserScrolledUp = checkUserScrolledUp();
    if (!currentIsUserScrolledUp) {
      console.log('Streaming message: user at bottom, auto-scroll to bottom');
      scrollToBottom();
      setHasNewMessages(false); // User at bottom, make sure no reminder
    } else {
      console.log(
        'Streaming message: user scrolled up, no auto-scroll, show reminder'
      );
      setHasNewMessages(true);
    }
  }, [isStreaming, scrollToBottom, checkUserScrolledUp]); // Add checkUserScrolledUp dependency

  // Scroll handling when streaming message content updates
  useEffect(() => {
    if (!streamingMessageTemp || !isStreaming) return;
    const currentIsUserScrolledUp = checkUserScrolledUp();
    if (!currentIsUserScrolledUp) {
      console.log(
        'Streaming message content updated: user at bottom, auto-scroll to bottom'
      );
      scrollToBottom();
      setHasNewMessages(false); // User at bottom, make sure no reminder
    } else {
      console.log(
        'Streaming message content updated: user scrolled up, no auto-scroll, show reminder'
      );
      setHasNewMessages(true);
    }
  }, [
    streamingMessageTemp?.content,
    isStreaming,
    scrollToBottom,
    checkUserScrolledUp,
  ]); // Add checkUserScrolledUp dependency

  // Handle when streaming message ends
  useEffect(() => {
    if (isStreaming) return; // Only execute when streaming message ends

    // When streaming message ends, do not auto-scroll, maintain user's current scroll position
    console.log(
      'Streaming message ended, maintain user current scroll position, do not scroll'
    );

    // Check if user is at bottom, if not show new message reminder
    const currentIsUserScrolledUp = checkUserScrolledUp();

    if (currentIsUserScrolledUp) {
      console.log(
        'Streaming message ended: user not at bottom, show new message reminder, do not scroll'
      );
      setHasNewMessages(true);
    } else {
      console.log(
        'Streaming message ended: user at bottom, no reminder, do not scroll'
      );
      setHasNewMessages(false);
    }
  }, [isStreaming, checkUserScrolledUp]); // Add checkUserScrolledUp dependency

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
                  <img src={img.previewUrl} alt="Preview image" />
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
                'Press Enter to send, Shift+Enter for new line'
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

      {/* New message reminder button */}
      {hasNewMessages && (
        <div
          className={styles.newMessageReminder}
          onClick={scrollToBottomAndClearReminder}
        >
          <span>New messages</span>
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
        console.error('Failed to get Apollo Client:', error);
      }
    };

    if (context?.component?.engine?.systemInterface) {
      initClient();
    }
  }, [context]);

  if (!client) return null;

  return <ChatRoomInner {...props} apolloClient={client} />;
};
