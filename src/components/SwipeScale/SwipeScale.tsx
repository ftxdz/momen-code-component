import { useRef, useEffect } from 'react';
import { EventHandler } from 'zvm-code-context';

import styles from './SwipeScale.module.css';

export interface SwipeScalePropData {
  targetCompId: string; 
  widthScale: number;
  isScaled: boolean; 
}

export interface SwipeScaleStateData {
  
}

export interface SwipeScaleEvent {
  onScale?: EventHandler;
}

export interface SwipeScaleProps {
  propData: SwipeScalePropData;
  propState: SwipeScaleStateData;
  event: SwipeScaleEvent;
}

export function SwipeScale({ propData, event }: SwipeScaleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalWidthRef = useRef<number>(0);
  
  useEffect(() => {
    const element = document.querySelector(`[data-comp-id="${propData.targetCompId}"]`) as HTMLElement;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    originalWidthRef.current = rect.width;

    
    element.style.height = `${rect.height}px`;
    element.style.transformOrigin = 'left';

    if (!propData.isScaled) {
      element.style.width = `${rect.width}px`;
      element.style.transform = 'translateX(0)';
    } 
  }, [propData.isScaled, propData.targetCompId, propData.widthScale]);

  const handleTouchStart = () => {
    const element = document.querySelector(`[data-comp-id="${propData.targetCompId}"]`) as HTMLElement;
    if (!element || !originalWidthRef.current) return;
    
    let startX = 0;
    let currentDiff = 0;
    element.style.transition = 'all 0.3s ease-out';
    
    const handleTouchMove = (e: TouchEvent) => {
      const currentX = e.touches[0].clientX;
      if (startX === 0) {
        startX = currentX;
        return;
      }

      const diff = startX - currentX;
      currentDiff = diff;
      if (diff > 0) {
        const progress = Math.min(diff / 100, 1);
        const newWidth = originalWidthRef.current * (1 + (propData.widthScale - 1) * progress);
        const translateX = originalWidthRef.current * (propData.widthScale - 1) * progress;
        
        element.style.width = `${newWidth}px`;
        element.style.transform = `translateX(${translateX}px)`;
      }
    };

    const handleTouchEnd = () => {
      const threshold = 50;
      
      if (currentDiff < threshold) {
        element.style.width = `${originalWidthRef.current}px`;
        element.style.transform = 'translateX(0)';
      } else {
        element.style.width = `${originalWidthRef.current * propData.widthScale}px`;
        element.style.transform = `translateX(${originalWidthRef.current * (propData.widthScale - 1)}px)`;
        event.onScale?.call(null);
      }
      
      element.style.transition = '';
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleMouseDown = () => {
    const element = document.querySelector(`[data-comp-id="${propData.targetCompId}"]`) as HTMLElement;
    if (!element || !originalWidthRef.current) return;

    let startX = 0;
    let currentDiff = 0;
    element.style.transition = 'all 0.3s ease-out';
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX;
      if (startX === 0) {
        startX = currentX;
        return;
      }

      const diff = startX - currentX;
      currentDiff = diff;
      if (diff > 0) {
        const progress = Math.min(diff / 100, 1);
        const newWidth = originalWidthRef.current * (1 + (propData.widthScale - 1) * progress);
        const translateX = originalWidthRef.current * (propData.widthScale - 1) * progress;
        
        element.style.width = `${newWidth}px`;
        element.style.transform = `translateX(${translateX}px)`;
      }
    };

    const handleMouseUp = () => {
      const threshold = 50;
      
      if (currentDiff < threshold) {
        element.style.width = `${originalWidthRef.current}px`;
        element.style.transform = 'translateX(0)';
      } else {
        element.style.width = `${originalWidthRef.current * propData.widthScale}px`;
        element.style.transform = `translateX(${originalWidthRef.current * (propData.widthScale - 1)}px)`;
        event.onScale?.call(null);
      }
      
      element.style.transition = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div 
      ref={containerRef}
      className={styles.swipeContainer}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        left: 0,
        top: 0,
        cursor: 'grab'
      }}
    />
  );
} 