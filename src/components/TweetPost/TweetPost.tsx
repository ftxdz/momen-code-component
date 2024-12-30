import { Tweet } from "react-tweet";
import styles from "./TweetPost.module.css";

export interface TweetPostPropData {
  tweetId: string;
  theme: string;
}

export interface TweetPostStateData {}

export interface TweetPostEvent {}

export interface TweetPostProps {
  propData: TweetPostPropData;
  propState: TweetPostStateData;
  event: TweetPostEvent;
}

export function TweetPost({ propData }: TweetPostProps) {
  return (
    <div className={styles.tweetContainer} data-theme={propData.theme}>
      <Tweet id={propData.tweetId} />
    </div>
  );
}
