const gql = (_: TemplateStringsArray) => _.join("");

export const GQL_GET_TASK = gql`
  query sendSmsRecordList {
  send_sms_record{
    id
    content
    task {
      content
      description
      purpose
      recipient_phone_number
    }
    send_datetime
    status
  }
}
`;


