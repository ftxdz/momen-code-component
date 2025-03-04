export const gql = (_: TemplateStringsArray) => _.join("");

export const GQL_SEND_CHATROOM_MESSAGE = gql`
  mutation SendMessage($objects: [chatroom_message_insert_input!]!) {
  insert_chatroom_message(
    objects: $objects
    on_conflict: { constraint: chatroom_message_id_key, update_columns: [id] }
  ) {
    affected_rows
  }
}
`;


