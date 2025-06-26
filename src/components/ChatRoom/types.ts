export interface Message {
  id: number;
  sender_id: number;
  sender: string;
  sender_avatar: string;
  contents: {
      id: number;
      text: string | null;
      type: "TEXT" | "IMAGE";
      image?: {
        url: string;
        id: number;
      } | null;
    }[];
  created_at: string;
}

export interface UploadedImage {
  imageId: string;
  previewUrl: string;
}
  
export interface MessageContent {
    id: number;
    type: "TEXT" | "IMAGE";
    text: string | null;
    image?: {
      url: string;
      id: number;
    } | null;
  }

// 新增：对话状态枚举
export enum ConversationStatus {
  CREATED = 'CREATED',
  IN_PROGRESS = 'IN_PROGRESS',
  STREAMING = 'STREAMING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

// 新增：对话状态订阅返回的数据类型
export interface ConversationStatusData {
  conversationId: number;
  data: string | null;
  reasoningContent: string | null;
  status: ConversationStatus;
}

// 新增：流式消息临时状态类型
export interface StreamingMessageTemp {
  id: string;
  type: 'reasoning' | 'result';
  content: string;
  timestamp: string;
}