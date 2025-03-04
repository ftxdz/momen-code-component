import { gql } from '@apollo/client';
export const GQL_SUBSCRIPTION_FOR_CHATMESSAGE = gql`
subscription subscriptionForConversation($conversationId: bigint!) {
  chatroom_message(
    where: { chatroom_chatroom: { _eq: $conversationId } }
    order_by: [{ id: asc }]
    distinct_on: [id]
  ) {
    id
    created_at
    updated_at
    type
    content
    user_account
    chatroom_chatroom
    user {
      id
      username
      profile_image{
        url
      }
    }
    image {
      url
    }
  }
}
`;