export interface YouTubeVideoPropData {
  youtubeVideoSrc:string;
}

export interface YouTubeVideoStateData {}

export interface YouTubeVideoEvent {}

export interface YouTubeVideoProps {
  propData: YouTubeVideoPropData;
  propState: YouTubeVideoStateData;
  event: YouTubeVideoEvent;
}

export function YouTubeVideo({propData}: YouTubeVideoProps) {
  

  return (
    <iframe
      width="100%"
      height="100%"
      src={propData.youtubeVideoSrc}
      title="YouTube video player"
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
    />
  );
}



