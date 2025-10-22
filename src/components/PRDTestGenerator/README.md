# PRD 测试用例生成器

一个功能完整的 PRD（产品需求文档）拆解和测试用例生成组件，支持 AI 驱动的需求分析和自动化测试用例生成。

## 功能特性

### 1. PRD 输入和图片上传

- 支持文本形式的 PRD 内容输入
- 支持多张图片上传，用于 PRD 文档解析
- 图片预览和删除功能
- 参考 ChatRoom 组件的图片上传实现

### 2. AI 驱动的 PRD 拆解

- 调用 AI 接口自动拆解 PRD 内容
- 实时流式显示 AI 处理过程
- 自动解析功能需求列表
- 支持项目背景信息提取

### 3. 功能需求管理

- 列表形式展示拆解出的功能需求
- 每个需求包含：描述、使用流程、输入规则、优先级等
- 支持用户补充额外信息
- 实时编辑和更新功能

### 4. 测试用例生成

- **单个生成**：为每个功能需求单独生成测试用例
- **批量生成**：一键为所有未生成测试用例的需求生成测试用例
- 实时显示生成进度和状态
- 自动标记已生成测试用例的需求

### 5. 飞书集成

- 支持飞书 CURL 命令输入
- 自动解析和替换 CURL 中的`body.mind_content`
- 将功能需求数据发送到飞书
- 完整的错误处理和状态反馈

## 技术实现

### 组件架构

```
PRDTestGenerator/
├── PRDTestGenerator.tsx          # 主组件
├── PRDTestGenerator.module.css   # 样式文件
├── index.ts                      # 导出文件
├── graphql.ts                    # GraphQL查询定义
├── feishuUtils.ts               # 飞书工具函数
└── README.md                    # 说明文档
```

### 核心依赖

- **React Hooks**: 状态管理和副作用处理
- **Ant Design**: UI 组件库
- **Apollo Client**: GraphQL 客户端
- **zvm-code-context**: 应用上下文和查询接口

### GraphQL 接口

1. **PRD 拆解接口**: `GQL_ANALYZE_PRD`
2. **测试用例生成接口**: `GQL_GENERATE_TEST_CASES`
3. **结果订阅接口**: `GQL_SUBSCRIPTION_PRD_RESULT`, `GQL_SUBSCRIPTION_TEST_CASES_RESULT`

### 飞书集成

- CURL 解析和验证
- JSON 数据替换
- HTTP 请求发送
- 错误处理和响应解析

## 使用方法

### 基本使用

```tsx
import { PRDTestGenerator } from './components/PRDTestGenerator';

function App() {
  return (
    <div>
      <PRDTestGenerator />
    </div>
  );
}
```

### 使用步骤

1. **输入 PRD 内容**：在文本框中输入 PRD 内容或上传相关图片
2. **拆解 PRD**：点击"拆解 PRD"按钮，AI 将自动分析并提取功能需求
3. **编辑需求**：在功能需求列表中补充额外信息
4. **生成测试用例**：选择单个生成或批量生成测试用例
5. **发送到飞书**：输入飞书 CURL 并发送数据

## 接口说明

### PRD 拆解接口

```graphql
mutation ZAICreateConversation(
  $inputArgs: Map_String_ObjectScalar!
  $zaiConfigId: String!
) {
  fz_zai_create_conversation(inputArgs: $inputArgs, zaiConfigId: $zaiConfigId)
}
```

**参数**:

- `inputArgs.mgt8q6sp_id`: 固定值 `[1020000000000003]`
- `inputArgs.mh07v0xv`: PRD 内容文本
- `inputArgs.imageIds`: 图片 ID 数组（可选）
- `zaiConfigId`: 配置 ID `"mgt7uxdg"`

### 测试用例生成接口

```graphql
mutation ZAICreateConversation(
  $inputArgs: Map_String_ObjectScalar!
  $zaiConfigId: String!
) {
  fz_zai_create_conversation(inputArgs: $inputArgs, zaiConfigId: $zaiConfigId)
}
```

**参数**:

- `inputArgs.mgua75zg`: 功能描述
- `inputArgs.mguamm3k`: 使用流程
- `inputArgs.mguggwms`: 输入规则
- `inputArgs.mgughlaf`: 测试场景 JSON
- `inputArgs.mgugl6tt`: 补充信息
- `inputArgs.mguh06no`: 输入规则（重复）
- `zaiConfigId`: 配置 ID `"mgua6wyt"`

## 样式定制

组件使用 CSS Modules，可以通过修改`PRDTestGenerator.module.css`文件来自定义样式：

- `.container`: 主容器样式
- `.inputCard`: 输入区域卡片样式
- `.resultCard`: 结果展示卡片样式
- `.requirementItem`: 功能需求项样式
- `.feishuCard`: 飞书发送区域样式

## 注意事项

1. **Apollo Client 依赖**: 组件需要 Apollo Client 来执行 GraphQL 查询和订阅
2. **图片上传**: 需要配置图片上传服务接口
3. **飞书 CURL**: 需要有效的飞书 API token 和正确的 CURL 格式
4. **错误处理**: 组件包含完整的错误处理和用户反馈机制
5. **性能优化**: 使用 useCallback 和 useMemo 优化渲染性能

## 扩展功能

组件设计为可扩展的架构，可以轻松添加：

- 更多 AI 接口集成
- 其他协作平台支持
- 自定义测试用例模板
- 数据导出功能
- 历史记录管理
