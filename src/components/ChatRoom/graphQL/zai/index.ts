export const gql = (_: TemplateStringsArray) => _.join("");

export const GQL_IMAGE_PRESIGNED_URL = gql`
  mutation ImagePresignedUrl(
    $imgMd5Base64: String!
    $imageSuffix: MediaFormat!
  ) {
    imagePresignedUrl(
      imageSuffix: $imageSuffix
      imgMd5Base64: $imgMd5Base64
      acl: PRIVATE
    ) {
      downloadUrl
      uploadUrl
      contentType
      imageId
      uploadHeaders
    }
  }
`;

export const GQL_SEND_MESSAGE = gql`
  mutation SendAiMessage(
    $conversationId: Long!
    $imageIds: [Long]
    $text: String
  ) {
    fz_zai_send_ai_message(
      conversationId: $conversationId
      imageIds: $imageIds
      text: $text
    )
  }
`;


