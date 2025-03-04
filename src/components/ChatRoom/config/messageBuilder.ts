

interface SendMessageParams {
  text?: string;
  imageIds?: string[];
  accountId: number;
  conversationId: number;
}

interface ChatroomMessageInput {
  type: string;
  content?: string;
  image_id?: number;
  user_account: string;
  chatroom_chatroom: string;
}

export const buildChatroomMessageObjects = ({
  text,
  imageIds,
  accountId,
  conversationId
}: SendMessageParams): { objects: ChatroomMessageInput[] } => {
  const messageObjects: ChatroomMessageInput[] = [];

  // 添加文本消息
  if (text) {
    messageObjects.push({
      type: 'TEXT',
      content: text,
      user_account: accountId.toString(),
      chatroom_chatroom: conversationId.toString()
    });
  }

  // 添加图片消息
  if (imageIds && imageIds.length > 0) {
    imageIds.forEach(imageId => {
      messageObjects.push({
        type: 'IMAGE',
        image_id: parseInt(imageId),
        user_account: accountId.toString(),
        chatroom_chatroom: conversationId.toString()
      });
    });
  }

  return { objects: messageObjects };
}; 