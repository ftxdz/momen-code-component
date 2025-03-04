export interface Message {
  id: number;
  sender_id: number;
  sender: string;
  sender_avatar: string;
  contents: {
      id: number;
      text: string | null;
      type: "TEXT" | "IMAGE";
      image?: {
        url: string;
        id: number;
      } | null;
    }[];
  created_at: string;
}

export interface UploadedImage {
  imageId: string;
  previewUrl: string;
}
  
export interface MessageContent {
    id: number;
    type: "TEXT" | "IMAGE";
    text: string | null;
    image?: {
      url: string;
      id: number;
    } | null;
  }