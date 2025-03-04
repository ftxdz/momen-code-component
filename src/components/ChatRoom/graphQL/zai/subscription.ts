import { gql } from '@apollo/client';
export const GQL_SUBSCRIPTION_FOR_CONVERSATION = gql`
subscription subscriptionForConversation($conversationId: bigint!) {
  fz_streaming_fz_message(
    where: { conversation_id: { _eq: $conversationId } role: { _neq: "system" } }
    order_by: [{ id: asc }]
    distinct_on: [id]
  ) {
    id
    sender:role
    token_usage
    created_at
    tool_calls(where: {}, order_by: [], distinct_on: [id]) {
      id
      name
      call_id
      type
      request
      response
      created_at
    }
    contents(order_by: [], distinct_on: [id]) {
      id
      type
      text
      json
      created_at
      image {
        id
        url
      }
    }
  }
}
`;