// PRD拆解AI接口
export const GQL_ANALYZE_PRD = `
  mutation ZAICreateConversation(
    $inputArgs: Map_String_ObjectScalar!
    $zaiConfigId: String!
  ) {
    fz_zai_create_conversation(inputArgs: $inputArgs, zaiConfigId: $zaiConfigId)
  }
`;

// 生成测试用例AI接口
export const GQL_GENERATE_TEST_CASES = `
  mutation ZAICreateConversation(
    $inputArgs: Map_String_ObjectScalar!
    $zaiConfigId: String!
  ) {
    fz_zai_create_conversation(inputArgs: $inputArgs, zaiConfigId: $zaiConfigId)
  }
`;

// PRD拆解结果订阅
export const GQL_SUBSCRIPTION_PRD_RESULT = `
  subscription subscriptionForPRDResult($conversationId: Long!) {
    fz_zai_listen_conversation_result(conversationId: $conversationId) {
      conversationId
      data
      reasoningContent
      status
      images
    }
  }
`;

// 测试用例生成结果订阅
export const GQL_SUBSCRIPTION_TEST_CASES_RESULT = `
  subscription subscriptionForTestCasesResult($conversationId: Long!) {
    fz_zai_listen_conversation_result(conversationId: $conversationId) {
      conversationId
      data
      reasoningContent
      status
      images
    }
  }
`;
