import { Message, MessageContent } from '../types'


interface ChatroomMessage {
  id: number;
  created_at: string;
  type: 'TEXT' | 'IMAGE';
  content?: string;
  user_account: number;
  chatroom_chatroom: number;
  user?: {
    id: number;
    username: string;
    profile_image?: {
      url: string;
    };
  };
  image?: {
    id: number;
    url: string;
  };
}

export const transformChatroomMessage = (data: ChatroomMessage): Message => {
  const contents: MessageContent[] = [];

  // 处理文本消息
  if (data.type === 'TEXT' && data.content) {
    contents.push({
      id: data.id,
      type: 'TEXT',
      text: data.content,
      image: null
    });
  }

  // 处理图片消息
  if (data.type === 'IMAGE' && data.image) {
    contents.push({
      id: data.id,
      type: 'IMAGE',
      text: null,
      image: {
        url: data.image.url,
        id: data.image.id
      }
    });
  }

  return {
    id: data.id,
    sender_id: data.user_account,
    sender: data.user?.username || '',
    sender_avatar: data.user?.profile_image?.url || '',
    contents: contents,
    created_at: data.created_at
  };
};

// 批量转换消息
export const transformChatroomMessages = (messages: ChatroomMessage[]): Message[] => {
  return messages.map(transformChatroomMessage);
}; 