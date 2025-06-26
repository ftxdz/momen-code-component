# ChatRoom 组件

## 功能概述

ChatRoom 组件是一个功能完整的聊天室组件，支持两种模式：
- **普通聊天室模式**：传统的用户间聊天
- **MomenAI 模式**：AI 助手对话模式

## 新增功能：状态订阅

### 功能描述

为 MomenAI 模式添加了状态订阅功能，可以实时监听对话的处理状态，提供更好的用户体验。

### 核心特性

1. **双订阅模式**
   - 消息订阅：处理具体的聊天消息
   - 状态订阅：处理对话的整体状态

2. **流式处理支持**
   - 实时显示 AI 的思考过程（累加显示）
   - 流式显示 AI 的响应内容（累加显示）
   - 防止用户在处理过程中重复发送消息

3. **状态管理**
   - 监听对话状态变化
   - 自动处理错误状态
   - 提供加载指示器

4. **性能优化**
   - 输入文字时不会触发订阅重新连接
   - 流式内容累加显示，提供更好的用户体验

### 技术实现

#### GraphQL 订阅

```typescript
// 状态订阅
export const GQL_SUBSCRIPTION_FOR_CONVERSATION_STATUS = gql`
subscription subscriptionForConversationStatus($conversationId: Long!) {
  fz_zai_listen_conversation_result(conversationId: $conversationId) {
    conversationId
    data
    reasoningContent
    status
  }
}
`;
```

#### 流式数据处理

```typescript
// 累加显示流式内容
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
```

#### 订阅优化

```typescript
// 优化的依赖数组，避免不必要的重新订阅
useEffect(() => {
  // 订阅逻辑...
  
  return () => {
    messageSubscriber.unsubscribe();
    if (statusSubscriber) {
      statusSubscriber.unsubscribe();
    }
  };
}, [apolloClient, propData.conversationId, isMomenAI]); // 最小化依赖
```

### 使用方式

#### 基本使用

```typescript
import { ChatRoom } from './components/ChatRoom';

const MyChatComponent = () => {
  const propData = {
    conversationId: 123,
    accountId: 456,
    isMomenAI: true, // 启用 AI 模式
    userImageUrl: "https://example.com/user.jpg",
    assistantImageUrl: "https://example.com/ai.jpg",
  };

  const propState = {
    sendMessageError: new State(""),
    subscribeMessageError: new State(""),
  };

  const event = {
    onSendMessageSuccess: () => console.log("消息发送成功"),
    onSendMessageError: () => console.log("消息发送失败"),
    onSubscribeMessageError: () => console.log("订阅错误"),
  };

  return (
    <ChatRoom
      propData={propData}
      propState={propState}
      event={event}
    />
  );
};
```

### 优化内容

#### 1. 订阅性能优化
- **问题**：输入文字时会触发订阅重新连接
- **解决**：优化 useEffect 依赖数组，只包含必要的依赖项
- **效果**：输入时不会重新建立订阅连接

#### 2. 流式显示优化
- **问题**：流式内容会替换而不是累加
- **解决**：修改 `handleStreamingData` 函数，实现内容累加
- **效果**：AI 响应内容会逐步累加显示，提供更好的用户体验

#### 3. 视觉优化
- **临时消息样式**：使用淡入动画和特殊边框
- **加载指示器**：只在需要时显示
- **禁用状态**：流式处理时禁用输入控件

### 样式定制

组件提供了以下 CSS 类用于样式定制：

- `.tempMessage`：临时消息样式
- `.streamingIndicator`：流式指示器样式
- `.typingDots`：打字动画样式
- `.fadeIn`：淡入动画效果

### 注意事项

1. **仅 MomenAI 模式支持**：状态订阅功能仅在 `isMomenAI` 为 `true` 时启用
2. **错误处理**：状态订阅错误不会影响主要功能，只记录日志
3. **性能优化**：使用 `useCallback` 优化回调函数，避免不必要的重渲染
4. **内存管理**：组件卸载时会自动清理所有订阅
5. **流式显示**：推理内容和结果数据会累加显示，而不是替换

### 扩展功能

可以根据需要扩展以下功能：

1. **更多状态处理**：添加对 `IN_PROGRESS`、`CANCELED` 等状态的处理
2. **进度显示**：显示处理进度百分比
3. **重试机制**：在失败时提供重试选项
4. **状态持久化**：将状态保存到本地存储
5. **打字机效果**：为流式内容添加更自然的打字机效果 