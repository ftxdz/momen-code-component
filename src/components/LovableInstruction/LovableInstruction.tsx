import { useState } from 'react';
import { State, EventHandler } from 'zvm-code-context';
import styles from './LovableInstruction.module.css';

export interface LovableInstructionPropData {
  zaiConfig: string;
  requireLogin: boolean;
  userPreference?: string; // 用户偏好设置，可选参数
  isMultiStep?: boolean;
}

export interface LovableInstructionEvent {
  onInstructionGeneratedSuccess?: EventHandler;
  onInstructionGeneratedError?: EventHandler;
}

export interface LovableInstructionStateData {
  result?: State<string>;
  error?: State<string>;
  project_exid?: State<string>;
}

export interface LovableInstructionProps {
  event: LovableInstructionEvent;
  propData: LovableInstructionPropData;
  propState: LovableInstructionStateData;
}

export function LovableInstruction({
  propData,
  propState,
  event,
}: LovableInstructionProps) {
  const [isLoading, setIsLoading] = useState(false);

  // GraphQL introspection query
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        subscriptionType { name }
        types {
          kind
          name
          fields(includeDeprecated: false) {
            name
            type { ...TypeRef }
          }
        }
      }
    }
    fragment TypeRef on __Type {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType { kind, name }
        }
      }
    }
  `;

  // Helper functions
  const getBaseType = (type: any) => {
    let currentType = type;
    while (currentType && currentType.ofType) {
      currentType = currentType.ofType;
    }
    return currentType;
  };

  const getFullTypeString = (type: any): string => {
    if (type.name) return type.name;
    if (type.kind === 'NON_NULL') return `${getFullTypeString(type.ofType)}!`;
    if (type.kind === 'LIST') return `[${getFullTypeString(type.ofType)}]`;
    return '';
  };

  const formatTypeFields = (
    typeName: string,
    schema: any,
    depth = 0,
    visited = new Set()
  ) => {
    if (visited.has(typeName) || depth > 10) {
      return (
        ' '.repeat(depth * 2) + `... [Circular reference to ${typeName}]\n`
      );
    }
    const typeDetails = schema.types.find((t: any) => t.name === typeName);
    if (!typeDetails || typeDetails.kind !== 'OBJECT' || !typeDetails.fields)
      return '';
    visited.add(typeName);
    let output = '';
    for (const field of typeDetails.fields) {
      const fullTypeString = getFullTypeString(field.type);
      const baseType = getBaseType(field.type);
      output += ' '.repeat(depth * 2) + `- ${field.name}: ${fullTypeString}\n`;
      output += formatTypeFields(
        baseType.name,
        schema,
        depth + 1,
        new Set(visited)
      );
    }
    return output;
  };

  const formatInputArgs = (inputArgs: any) => {
    if (!inputArgs || Object.keys(inputArgs).length === 0) {
      return 'This agent does not require any input arguments.';
    }
    let output =
      'The `fz_zai_create_conversation` mutation takes `inputArgs` (a JSON Object) and `zaiConfigId`.\n';
    output +=
      'The `inputArgs` object for this agent expects the following keys:\n';
    for (const key in inputArgs) {
      const arg = inputArgs[key];
      output += `\n- **Key**: \`${key}\` (**Display Name**: "${arg.displayName}", **Type**: ${arg.type})\n`;
    }
    return output;
  };

  const generateFileUploadInstructions = (
    inputArgs: any,
    supportsImage: boolean,
    supportsVideo: boolean,
    isMultiStep: boolean
  ) => {
    const hasImage = Object.values(inputArgs).some(
      (arg: any) => arg.type === 'IMAGE'
    );
    const hasVideo = Object.values(inputArgs).some(
      (arg: any) => arg.type === 'VIDEO'
    );
    let instructions = '';
    let keyPointsAboutFile = '';
    if (!hasImage && !hasVideo && !supportsImage && !supportsVideo)
      return {
        instructions: instructions.trim(),
        keyPointsAboutFile: keyPointsAboutFile.trim(),
      };

    if (!isMultiStep) {
      if (hasImage || hasVideo) {
        instructions += `#### File Handling`;
        keyPointsAboutFile += `### Image/Video Processing:
- Download URL Retrieval: Use media ID to get download URL for display.
- Chat Integration: Integrate media display into the chat message flow.`;
      }
      if (hasImage) {
        instructions += `
##### Image Upload
Use the \`imagePresignedUrl\` mutation.
\`\`\`graphql
mutation GetImageUploadUrl($md5: String!, $suffix: MediaFormat!, $acl: CannedAccessControlList) {
  imagePresignedUrl(imgMd5Base64: $md5, imageSuffix: $suffix, acl: $acl) {
    imageId
    uploadUrl
    uploadHeaders
    downloadUrl
    contentType
  }
}
\`\`\`
Example Variables: \`{ "md5": "[Base64-encoded MD5]", "suffix": "PNG", "acl": "PRIVATE" }\``;
      }
      if (hasVideo) {
        instructions += `
##### Video Upload
Use the \`videoPresignedUrl\` mutation.
\`\`\`graphql
mutation GetImageUploadUrl($md5: String!, $suffix: MediaFormat!, $acl: CannedAccessControlList) {
  imagePresignedUrl(imgMd5Base64: $md5, imageSuffix: $suffix, acl: $acl) {
    imageId
    uploadUrl
    uploadHeaders
    downloadUrl
    contentType
  }
}
\`\`\`
Example Variables: \`{ "md5": "[Base64-encoded MD5]", "suffix": "PNG", "acl": "PRIVATE" }\``;
      }
      if (hasImage || hasVideo) {
        instructions += `
##### Upload Process:
1. Send a \`PUT\` request to the \`uploadUrl\` with the raw file.
2. Include \`uploadHeaders\` if provided.
**Enums**:
  - \`CannedAccessControlList\`: \`PRIVATE\` (recommended), \`AUTHENTICATE_READ\`, \`AWS_EXEC_READ\`, \`BUCKET_OWNER_FULL_CONTROL\`, \`BUCKET_OWNER_READ\`, \`DEFAULT\`, \`LOG_DELIVERY_WRITE\`, \`PUBLIC_READ\`, \`PUBLIC_READ_WRITE\`
   \`MediaFormat\`:
  - \`MediaFormat\`: \`PNG\`, \`JPG\`, \`JPEG\`, \`GIF\`, \`WEBP\`, \`MP4\`, \`MOV\`, \`WAV\`, \`MP3\`, \`PDF\`, \`DOC\`, \`DOCX\`, \`PPT\`, \`PPTX\`, \`XLS\`, \`XLSX\`, \`CSV\`, \`JSON\`, \`XML\`, \`TXT\`, \`HTML\`, \`CSS\`, \`ICO\`, \`SVG\`, \`OTHER\``;
      }
    } else {
      if (supportsImage || supportsVideo) {
        instructions += `#### File Handling`;
        keyPointsAboutFile += `### Image/Video Processing:
- Download URL Retrieval: Use media ID to get download URL for display.
- Chat Integration: Integrate media display into the chat message flow.`;
      }
      if (supportsImage) {
        instructions += `
##### Image Upload
Use the \`imagePresignedUrl\` mutation.
\`\`\`graphql
mutation GetImageUploadUrl($md5: String!, $suffix: MediaFormat!, $acl: CannedAccessControlList) {
  imagePresignedUrl(imgMd5Base64: $md5, imageSuffix: $suffix, acl: $acl) {
    imageId
    uploadUrl
    uploadHeaders
    downloadUrl
    contentType
  }
}
\`\`\`
Example Variables: \`{ "md5": "[Base64-encoded MD5]", "suffix": "PNG", "acl": "PRIVATE" }\``;
      }
      if (supportsVideo) {
        instructions += `
##### Video Upload
Use the \`videoPresignedUrl\` mutation.
\`\`\`graphql
mutation GetImageUploadUrl($md5: String!, $suffix: MediaFormat!, $acl: CannedAccessControlList) {
  imagePresignedUrl(imgMd5Base64: $md5, imageSuffix: $suffix, acl: $acl) {
    imageId
    uploadUrl
    uploadHeaders
    downloadUrl
    contentType
  }
}
\`\`\`
Example Variables: \`{ "md5": "[Base64-encoded MD5]", "suffix": "PNG", "acl": "PRIVATE" }\``;
      }
      if (supportsImage || supportsVideo) {
        instructions += `
##### Upload Process:
1. Send a \`PUT\` request to the \`uploadUrl\` with the raw file.
2. Include \`uploadHeaders\` if provided.
**Enums**:
  - \`CannedAccessControlList\`: \`PRIVATE\` (recommended), \`AUTHENTICATE_READ\`, \`AWS_EXEC_READ\`, \`BUCKET_OWNER_FULL_CONTROL\`, \`BUCKET_OWNER_READ\`, \`DEFAULT\`, \`LOG_DELIVERY_WRITE\`, \`PUBLIC_READ\`, \`PUBLIC_READ_WRITE\`
   \`MediaFormat\`:
  - \`MediaFormat\`: \`PNG\`, \`JPG\`, \`JPEG\`, \`GIF\`, \`WEBP\`, \`MP4\`, \`MOV\`, \`WAV\`, \`MP3\`, \`PDF\`, \`DOC\`, \`DOCX\`, \`PPT\`, \`PPTX\`, \`XLS\`, \`XLSX\`, \`CSV\`, \`JSON\`, \`XML\`, \`TXT\`, \`HTML\`, \`CSS\`, \`ICO\`, \`SVG\`, \`OTHER\``;
      }
    }
    return {
      instructions: instructions.trim(),
      keyPointsAboutFile: keyPointsAboutFile.trim(),
    };
  };

  // 生成登录相关的指令
  const generateLoginInstructions = (requireLogin: boolean): string => {
    if (!requireLogin) {
      return '';
    }
    const registerQuery = `mutation AuthenticateWithUsername(
      $username: String!
      $password: String!
    ) {
      authenticateWithUsername(
        username: $username
        password: $password
        register: true
      ) {
        account {
          id
          permissionRoles
        }
        jwt {
          token
        }
      }
    }`;
    const loginQuery = `mutation LoginUser($username: String!, $password: String!) {
      loginWithPassword(name: $username, password: $password) {
        jwt {
          token
        }
      }
    }`;
    return `#### Obtain Authentication Token
1. Use the \`loginWithPassword\` mutation to authenticate users:
\`\`\`graphql
${loginQuery}
\`\`\`
2. For new users, use the \`authenticateWithUsername\` mutation with \`register: true\`:
\`\`\`
${registerQuery}
\`\`\`
**Post-Authentication**:
- Store the JWT token in \`localStorage\`.
- Redirect to the main page (e.g., \`/dashboard\`).
- Include \`Authorization: Bearer {token}\` in all subsequent HTTP requests`;
  };

  // Convert project link format from editor.momen.app to villa.momen.app
  const convertEndpointFormat = (projectExId: string): string => {
    return `https://villa.momen.app/zero/${projectExId}/api/graphql-v2`;
  };

  // 从 zaiConfig 中获取 outputConfig
  const getOutputStructure = (zaiConfig: any) => {
    if (!zaiConfig?.zAiConfig?.outputConfig?.isStructured) {
      return {};
    }

    try {
      const customTypeId = zaiConfig.zAiConfig.outputConfig.customTypeId;
      if (!customTypeId) {
        return {};
      }

      // 在 customTypeDefinitionById 中找到对应的定义
      const customTypeDef = zaiConfig.customTypeDefinitionById?.[customTypeId];
      if (!customTypeDef) {
        console.warn(
          `Custom type definition not found for ID: ${customTypeId}`
        );
        return {};
      }

      // 获取 typeIdentifier
      const typeIdentifier = customTypeDef.schema?.typeIdentifier;
      if (!typeIdentifier) {
        console.warn(
          `Type identifier not found in custom type definition: ${customTypeId}`
        );
        return {};
      }

      // 通过 typeIdentifier 找到最终的 schema
      const finalSchema = zaiConfig.customTypeDefinitionById?.[typeIdentifier];
      if (!finalSchema) {
        console.warn(
          `Final schema not found for type identifier: ${typeIdentifier}`
        );
        return {};
      }

      return finalSchema.schema;
    } catch (error) {
      console.warn('Failed to get output structure:', error);
      return {};
    }
  };

  // Check agent capabilities for image and video support
  const checkAgentCapabilities = async (
    modelName: string
  ): Promise<{
    supportsImage: boolean;
    supportsVideo: boolean;
    supportsImageOutput: boolean;
  }> => {
    // 针对特定模型名称直接返回指定能力
    if (modelName === 'GPT 3.5 turbo') {
      return {
        supportsImage: false,
        supportsVideo: false,
        supportsImageOutput: false,
      };
    }
    if (modelName === 'GPT 4o mini' || modelName === 'GPT 4o') {
      return {
        supportsImage: true,
        supportsVideo: false,
        supportsImageOutput: false,
      };
    }
    // 其他情况走原有逻辑
    let supportsImage = false;
    let supportsVideo = false;
    let supportsImageOutput = false;

    try {
      const capabilitiesResponse = await fetch(
        'https://backend.momen.app/api/graphql',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operationName: 'SupportedCustomModelDescriptor',
            variables: {},
            query:
              'query SupportedCustomModelDescriptor { supportedCustomModelDescriptor { chatModelDescriptors } }',
          }),
        }
      );
      if (capabilitiesResponse.ok) {
        const capabilitiesData = await capabilitiesResponse.json();

        const descriptors =
          capabilitiesData.data?.supportedCustomModelDescriptor
            ?.chatModelDescriptors;

        if (descriptors && descriptors.length > 0) {
          // 查找用户配置中指定的模型
          const targetModel = descriptors.find(
            (descriptor: any) =>
              descriptor.customModelIdentifier &&
              descriptor.customModelIdentifier.id === modelName
          );

          if (targetModel) {
            const features = targetModel.features;
            supportsImage = features?.imageInput || features?.imageMessageInput;
            supportsVideo = features?.videoInput || features?.videoMessageInput;
            // 检查是否支持图片输出
            supportsImageOutput = features?.imageOutput || false;
          } else {
            // 如果找不到指定模型，使用第一个模型作为fallback
            const features = descriptors[0].features;
            supportsImage = features?.imageInput || features?.imageMessageInput;
            supportsVideo = features?.videoInput || features?.videoMessageInput;
            supportsImageOutput = features?.imageOutput || false;
          }
        }
      }
    } catch (error) {
      console.log(
        'Could not check agent capabilities:',
        error instanceof Error ? error.message : error
      );
    }
    return { supportsImage, supportsVideo, supportsImageOutput };
  };

  // 通用的布尔值验证和转换函数
  const validateBoolean = (
    value: any,
    fieldName: string,
    defaultValue: boolean = false
  ): boolean => {
    if (typeof value === 'boolean') {
      return value;
    } else if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      if (lowerValue === 'true' || lowerValue === '1') {
        return true;
      } else if (lowerValue === 'false' || lowerValue === '0') {
        return false;
      } else {
        throw new Error(
          `Invalid ${fieldName} value: "${value}". Must be a boolean or string "true"/"false"/"1"/"0".`
        );
      }
    } else if (value === undefined || value === null) {
      return defaultValue; // 使用默认值
    } else {
      throw new Error(
        `Invalid ${fieldName} type: ${typeof value}. Must be a boolean or string.`
      );
    }
  };

  const generateInstructions = (
    gqlUrl: string,
    configId: string,
    operationName: string,
    inputArgsDetails: string,
    fileUploadInstructions: string,
    loginInstructions: string,
    requireLogin: boolean,
    userPreference: string,
    isStreaming: boolean,
    isStructuredOutput: boolean,
    supportsImageOutput: boolean,
    outputStructure: any,
    isMultiStep: boolean,
    keyPointsAboutFile: string
  ) => {
    let subscriptionUrl = '';
    try {
      const url = new URL(gqlUrl);
      const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      const path = url.pathname.replace('/graphql-v2', '/graphql-subscription');
      subscriptionUrl = `${wsProtocol}//${url.host}${path}`;
    } catch (e) {
      subscriptionUrl = '[Could not derive subscription URL from endpoint]';
    }

    const invokeQuery = `mutation StartAgent($configId: String!, $inputs: Map_String_ObjectScalar!) {
  fz_zai_create_conversation(zaiConfigId: $configId, inputArgs: $inputs)
}`;
    const subscriptionQuery = `subscription ${operationName}($conversationId: Long!) {
  fz_zai_listen_conversation_result(conversationId: $conversationId) {
    data
    reasoningContent
    status
  }
}`;
    const subscriptionForConversationWithImageOutput = `subscription ZaiListenConversationResult($conversationId: Long!) {
  fz_zai_listen_conversation_result(conversationId: $conversationId) {
    conversationId
    status
    reasoningContent
    images {
      id
      url
      __typename
    }
    data
    __typename
  }
}

`;
    const minifiedSubscriptionQuery = subscriptionQuery
      .replace(/\s\s+/g, ' ')
      .trim();

    // 使用新的函数生成登录指令

    let finalString = `# Background
You are a frontend development expert using Lovable.

# Task
Create a complete web application that includes an AI Agent, with the backend connected to the Momen platform. 

## Application Requirements
${requireLogin ? 'Login is required before triggering the AI Agent.' : ''}
${userPreference}

## Technical Configuration
- **Frontend**: React + TypeScript + Vite
- **State Management**: Apollo GraphQL Client + React Context
- **Real-time Communication**: WebSocket subscriptions
${requireLogin ? '- **Authentication**: JWT Token + localStorage' : ''}
- **Image Processing**: File upload + MD5 hashing

### Backend
- **Protocol**: GraphQL
- **HTTP URL**:  ${gqlUrl}
- **WebSocket URL**: ${subscriptionUrl}

### Momen Platform Interfaces
${loginInstructions}
${fileUploadInstructions}

#### AI Agent Invocation
${
  requireLogin
    ? `Make a POST request to the HTTP URL with "Authorization: Bearer {token}"`
    : ''
}
##### 1. Start Conversation
  - Use the \`fz_zai_create_conversation\` mutation:
    \`\`\`graphql
    ${invokeQuery}
    \`\`\`
    Example Variables: \`{ "configId": "${configId}", "inputs": { /* your args here */ } }\`
  ${inputArgsDetails}
  - The return value is \`conversationId\`, a bigint used for listening to results.

##### 2. Subscribe to Results via WebSocket
  - Establish a WebSocket connection to \`${subscriptionUrl}\`.
  - Send a "connection_init" message to authenticate:
  \`\`\`javascript
  const ws = new WebSocket('${subscriptionUrl}');
  ws.send(JSON.stringify({
    type: "connection_init",
    payload: { authToken: "[yourAuthToken]" }
  }));
  \`\`\`
  Note: If the user is not logged in, payload is {}.
${
  supportsImageOutput
    ? `- Send a "start" message to subscribe image output updates to the conversation:
    \`\`\`javascript
    ws.send(JSON.stringify({
      id: "2", // Must be unique per subscription
      type: "start",
      payload: {
        operationName: "ZaiListenConversationResult",
        query: "${subscriptionForConversationWithImageOutput}",
        variables: { conversationId: Number(conversationId) }
      }
    }));
    \`\`\``
    : `- Send a "start" message to subscribe to the conversation:
    \`\`\`javascript
    ws.send(JSON.stringify({
      id: "1", // Must be unique per subscription
      type: "start",
      payload: {
        operationName: "${operationName}",
        query: "${minifiedSubscriptionQuery}",
        variables: { conversationId: Number(conversationId) }
      }
    }));
    \`\`\``
}
    - Handle Messages:
    \`\`\`javascript
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received:', data);
      
      // Handle different message types
      if (data.type === 'data') {
        const result = data.payload.data.fz_zai_listen_conversation_result;
        console.log('AI Response:', result.data);
        console.log('Reasoning:', result.reasoningContent);
        console.log('Status:', result.status);
      }
    };
    \`\`\`
    The status field can be one of:
    - CANCELED
    - COMPLETED
    - CREATED
    - FAILED
    - IN_PROGRESS
    - STREAMING
    - THINKING_CHAIN_STREAMING
${
  isStructuredOutput
    ? `The result.data field type is: object.Below is the JSON Schema for this data:
\`\`\`jsonschema
${JSON.stringify(outputStructure, null, 2)}
\`\`\`
**Notes:**
Handle returned data that may not conform to the JSON Schema, capture and fix errors or malformed JSON to ensure stable and reliable data processing.
1. Wrap JSON.parse() in try-catch to prevent parsing errors.
2. Provide a plain text fallback for non-structured data.
3. Validate the data structure integrity before rendering on the page.
4. Provide clear error messages for malformed JSON.`
    : 'The result.data field type is: string'
}
${
  isStreaming
    ? `**Streaming Notes:**
- Listen for data pushed through the WebSocket subscription and retrieve the text returned from the backend in real time.
- Gradually append the received data to the state of the Output component, using setTimeout or requestAnimationFrame to control the rendering speed for a smooth, character-by-character or chunk-by-chunk display effect.
- Handle WebSocket connection errors (e.g., disconnection) and display them in the Error component.
`
    : ''
}
${
  isMultiStep
    ? `**Multi-Step Notes:**
- Use the \`fz_zai_create_conversation\` mutation to start a new conversation for each step.
- Use the \`fz_zai_listen_conversation_result\` subscription to listen for the result of each step.
- Use the \`fz_zai_cancel_conversation\` mutation to cancel a conversation.
`
    : ''
}
### AI Agent Invocation Process
1. Obtain authToken through the login/registration interface.
Note: Check the token in localStorage during initialization, implement login/registration/logout functionality. Use setContext link to dynamically add Authorization: Bearer {token} header to each HTTP request, ensuring all GraphQL requests after login carry the correct authentication information.
2. Invoke the agent, with the following notes:
  1. Agent input parameters
  2. File handling: First upload via the interface to get the file ID, then use it as the agent's input parameter.
3. Subscribe to results via WebSocket.
4. Display the results returned by the AI Agent.

## Key Implementation Points
### General
- Add Detailed Code Comments: Comments should explain why the code is written this way, its purpose, and how it contributes to the functionality.
- Use Console Logs for Debugging: Insert console.log statements strategically to track variable values, function execution, and data flow during development.

### Environment Considerations
- **Browser Environment**: Use ES6 imports, no \`require()\`
- **TypeScript**: Proper type definitions required
- **Vite**: ES modules only, no CommonJS mixing

${keyPointsAboutFile}

### User Input Parameter Handling:
- Parameter Collection: Create forms or input interfaces for agent-specific parameters.
- Input Validation: Validate user input before creating conversations.
- Parameter Storage: Store user-provided parameters for conversation creation.
- Form State Management: Manage form state and user input validation.
- Error Handling: Provide clear error messages for invalid input.

### Stability Improvements:
- Use intelligent retry mechanisms for network requests and WebSocket connections.
- Monitor connection status and provide clear feedback to users.
- Implement error recovery to ensure a smooth user experience even in case of failures.
- Add console logs to assist with debugging and quickly identify issues during development.

### Performance Optimization:
- Efficiently manage WebSocket and HTTP connections, using connection pooling where appropriate.
- Deduplicate requests to avoid redundant network traffic.
- Prevent memory leaks by cleaning up unused resources and managing state carefully.
`;
    return finalString.trim();
  };

  const handleInspect = async () => {
    const config = propData.zaiConfig;

    // Validate and convert requireLogin
    let requireLogin: boolean;
    let isMultiStep: boolean;
    try {
      requireLogin = validateBoolean(
        propData.requireLogin,
        'requireLogin',
        false
      );
      isMultiStep = validateBoolean(propData.isMultiStep, 'isMultiStep', false);
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Invalid requireLogin parameter';
      propState.error?.set(errorMsg);
      event.onInstructionGeneratedError?.call(null, errorMsg);
      return;
    }

    // Validate and process user preference
    const userPreference = propData.userPreference || '';

    if (!config?.trim()) {
      const errorMsg = 'Please provide both a project link and a ZAI Config.';
      propState.error?.set(errorMsg);
      event.onInstructionGeneratedError?.call(null, errorMsg);
      return;
    }

    // Convert project link format for internal processing

    let zaiConfig, configId, inputArgs, projectExId;
    try {
      zaiConfig = JSON.parse(config);
      configId = zaiConfig.zAiConfig.id;
      inputArgs = zaiConfig.zAiConfig.inputArgs || {};
      projectExId = zaiConfig.projectExId;
      if (!configId)
        throw new Error("Field 'zAiConfig.id' not found in the provided JSON.");
      if (!projectExId)
        throw new Error("Field 'projectExId' not found in the provided JSON.");
    } catch (e) {
      const errorMsg = `Error parsing ZAI Config: ${
        e instanceof Error ? e.message : 'Unknown error'
      }`;
      propState.error?.set(errorMsg);
      event.onInstructionGeneratedError?.call(null, errorMsg);
      return;
    }

    const convertedEndpoint = convertEndpointFormat(projectExId);

    const outputStructure = getOutputStructure(zaiConfig);
    const operationName = `fz_listen_zai_${configId}`;
    setIsLoading(true);

    try {
      const response = await fetch(convertedEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: introspectionQuery }),
      });

      if (!response.ok)
        throw new Error(
          `Network error: ${response.status} ${response.statusText}`
        );
      const schemaData = await response.json();
      if (schemaData.errors)
        throw new Error(
          `GraphQL error: ${schemaData.errors
            .map((e: any) => e.message)
            .join(', ')}`
        );

      const schema = schemaData.data.__schema;

      const inputArgsDetails = formatInputArgs(inputArgs);

      const rootTypeInfo = schema.subscriptionType;
      if (!rootTypeInfo || !rootTypeInfo.name)
        throw new Error('This schema has no subscription type defined.');

      const operationRoot = schema.types.find(
        (t: any) => t.name === rootTypeInfo.name
      );
      if (!operationRoot || !operationRoot.fields)
        throw new Error(
          `The root subscription type '${rootTypeInfo.name}' could not be found or has no fields.`
        );

      const lowerCaseOperationName = operationName.toLowerCase();
      const targetOperation = operationRoot.fields.find(
        (f: any) => f.name.toLowerCase() === lowerCaseOperationName
      );
      if (!targetOperation) {
        const availableFields = operationRoot.fields
          .map((f: any) => f.name)
          .join(',\n');
        throw new Error(
          `Subscription '${operationName}' not found. Available fields:\n${availableFields}`
        );
      }

      const operationReturnType = getBaseType(targetOperation.type);
      const operationReturnTypeName = operationReturnType.name;
      const operationReturnTypeDetails = schema.types.find(
        (t: any) => t.name === operationReturnTypeName
      );
      if (!operationReturnTypeDetails || !operationReturnTypeDetails.fields)
        throw new Error(
          `Could not find details for return type: '${operationReturnTypeName}'.`
        );

      const dataField = operationReturnTypeDetails.fields.find(
        (f: any) => f.name === 'data'
      );
      if (!dataField)
        throw new Error(
          `The return type '${operationReturnTypeName}' does not have a 'data' field.`
        );

      // 检查agent是否支持结构化输出
      const isStructured =
        zaiConfig.zAiConfig.outputConfig?.isStructured || false;
      let modelName = zaiConfig.zAiConfig.model;
      if (
        zaiConfig.zAiConfig.customModelIdentifier &&
        typeof zaiConfig.zAiConfig.customModelIdentifier === 'object' &&
        Object.keys(zaiConfig.zAiConfig.customModelIdentifier).length > 0 &&
        zaiConfig.zAiConfig.customModelIdentifier.id
      ) {
        modelName = zaiConfig.zAiConfig.customModelIdentifier.id;
      }
      const { supportsImage, supportsVideo, supportsImageOutput } =
        await checkAgentCapabilities(modelName);
      const { instructions: fileUploadInstructions, keyPointsAboutFile } =
        generateFileUploadInstructions(
          inputArgs,
          supportsImage,
          supportsVideo,
          isMultiStep
        );
      // 检查agent是否支持流式输出
      const isStreaming =
        zaiConfig.zAiConfig.outputConfig?.isStreaming || false;
      const loginInstructions = generateLoginInstructions(requireLogin);
      const finalInstructions = generateInstructions(
        convertedEndpoint,
        configId,
        targetOperation.name,
        inputArgsDetails,
        fileUploadInstructions,
        loginInstructions,
        requireLogin,
        userPreference,
        isStreaming,
        isStructured,
        supportsImageOutput,
        outputStructure,
        isMultiStep,
        keyPointsAboutFile
      );
      propState.result?.set(finalInstructions);
      event.onInstructionGeneratedSuccess?.call(null, finalInstructions);
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Unknown error occurred';
      propState.error?.set(errorMsg);
      event.onInstructionGeneratedError?.call(null, errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 现有按钮等内容 */}
      <button
        onClick={handleInspect}
        disabled={isLoading}
        className={styles.generateButton}
      >
        {/* 当 isLoading 为 true 时，仅显示加载文字，不显示按钮内容和图标 */}
        {isLoading ? (
          <div className={styles.loadingText}>Generating...</div>
        ) : (
          <div className={styles.buttonContent}>
            <span className={styles.buttonText}>Generate Your Prompt</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 19 18"
              fill="none"
              className={styles.buttonIcon}
            >
              <path
                d="M11 3.75L16.25 9M16.25 9L11 14.25M16.25 9L2.75 9"
                stroke="#F9FAFB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </button>
    </>
  );
}
