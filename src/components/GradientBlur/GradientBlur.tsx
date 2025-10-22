import styles from './GradientBlur.module.css';

export interface GradientBlurPropData {}

export interface GradientBlurStateData {}

export interface GradientBlurEvent {}

export interface GradientBlurProps {
  propData: GradientBlurPropData;
  propState: GradientBlurStateData;
  event: GradientBlurEvent;
}

export function GradientBlur({}: GradientBlurProps) {
  return (
    <div className={styles['gradient-blur-container']}>
      {/* 渐变背景层 */}
      <div className={styles['gradient-blur-background']}></div>
    </div>
  );
}
