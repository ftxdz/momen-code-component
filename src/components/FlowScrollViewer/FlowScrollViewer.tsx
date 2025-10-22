import './FlowScrollViewer.css';
import { useState, useEffect, useRef } from 'react';
import { useAppContext } from 'zvm-code-context';
import { GQL_GET_BUILDING_FLOW } from './getBuildingFlow';

export interface FlowScrollViewerPropData {}

export interface FlowScrollViewerStateData {}

export interface FlowScrollViewerEvent {}

export interface FlowScrollViewerProps {
  propData: FlowScrollViewerPropData;
  propState: FlowScrollViewerStateData;
  event: FlowScrollViewerEvent;
}

export function FlowScrollViewer({}: FlowScrollViewerProps) {
  const { query } = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const [dynamicListData, setDynamicListData] = useState([
    { title: '', description: '', image: '' },
  ]); // Use dynamic data
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollThreshold = 10; // Scroll threshold (reduced)
  const scrollCooldown = 150; // Scroll cooldown time (milliseconds) (reduced)

  // Function to fetch building_flow data
  const fetchBuildingFlow = async () => {
    try {
      const { data } = await query(GQL_GET_BUILDING_FLOW, {});
      return data.building_flow.length > 0 ? data.building_flow : [];
    } catch (error) {
      console.error('Failed to fetch building_flow data:', error);
      return [];
    }
  };

  // Function to transform building_flow data to list item format
  const transformBuildingFlowToListItems = (buildingFlowData: any[]) => {
    return buildingFlowData.map((item, index) => ({
      title: item.title || `Title ${index + 1}`,
      description: item.content || 'No description available',
      image:
        item.image?.url ||
        `https://via.placeholder.com/430x526/3b82f6/ffffff?text=Item+${
          index + 1
        }`,
    }));
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      const buildingFlowData = await fetchBuildingFlow();
      if (buildingFlowData.length > 0) {
        const transformedData =
          transformBuildingFlowToListItems(buildingFlowData);
        setDynamicListData(transformedData);
      }
    };

    loadData();
  }, []);

  // Detect if it's a mobile device
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 700;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Handle scroll events (desktop)
  useEffect(() => {
    if (isMobile) return; // Don't handle wheel events on mobile

    const handleWheel = (e: WheelEvent) => {
      // Check if the event occurred within the component area
      const target = e.target as Element;
      const component = document.querySelector('.flow-scroll-viewer');

      if (!component || !component.contains(target)) {
        return; // If the scroll event is not within the component area, don't handle it
      }
      const isAtFirst = currentIndex === 0;
      const isAtLast = currentIndex === dynamicListData.length - 1;
      if ((isAtFirst && e.deltaY < 0) || (isAtLast && e.deltaY > 0)) {
        return;
      }
      // Immediately prevent default behavior to prevent page scrolling
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const now = Date.now();

      // Check if within cooldown period
      if (now - lastScrollTimeRef.current < scrollCooldown) {
        return;
      }

      // Check if scroll distance meets threshold (reduced requirement)
      const scrollDelta = Math.abs(e.deltaY);
      if (scrollDelta < scrollThreshold) {
        return;
      }

      // Check if at boundary position

      // Update last scroll time
      lastScrollTimeRef.current = now;

      // Set scrolling state
      if (!isScrolling) {
        setIsScrolling(true);
      }

      // Clear previous timer
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Switch items based on scroll direction
      if (e.deltaY > 0) {
        // Scroll down, switch to next
        setCurrentIndex((prev) => {
          const nextIndex = Math.min(prev + 1, dynamicListData.length - 1);
          return nextIndex !== prev ? nextIndex : prev;
        });
      } else {
        // Scroll up, switch to previous
        setCurrentIndex((prev) => {
          const nextIndex = Math.max(prev - 1, 0);
          return nextIndex !== prev ? nextIndex : prev;
        });
      }

      // Set scroll end timer
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 200);
    };

    // Add keyboard event support
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the event occurred within the component area
      const target = e.target as Element;
      const component = document.querySelector('.flow-scroll-viewer');

      if (!component || !component.contains(target)) {
        return; // If the keyboard event is not within the component area, don't handle it
      }

      const now = Date.now();
      if (now - lastScrollTimeRef.current < scrollCooldown) {
        return;
      }

      let shouldUpdate = false;
      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault();
          shouldUpdate = true;
          newIndex = Math.min(currentIndex + 1, dynamicListData.length - 1);
          break;
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault();
          shouldUpdate = true;
          newIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'Home':
          e.preventDefault();
          shouldUpdate = true;
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          shouldUpdate = true;
          newIndex = dynamicListData.length - 1;
          break;
      }

      if (shouldUpdate && newIndex !== currentIndex) {
        lastScrollTimeRef.current = now;
        setCurrentIndex(newIndex);
      }
    };

    // Add event listeners
    document.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    });
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('wheel', handleWheel, { capture: true });
      document.removeEventListener('keydown', handleKeyDown, { capture: true });

      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isScrolling, isMobile, dynamicListData.length]);

  // Simplified mobile swipe handling
  useEffect(() => {
    if (!isMobile) return;

    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      setSlideOffset(0); // Reset swipe offset
    };

    const handleTouchMove = (e: TouchEvent) => {
      const moveX = e.touches[0].clientX;
      const moveY = e.touches[0].clientY;
      const deltaX = moveX - startX;
      const deltaY = moveY - startY;

      // Only process if horizontal swipe distance is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        e.preventDefault();

        // Limit swipe range to prevent excessive swiping
        const maxOffset = window.innerWidth * 0.3;
        const clampedOffset = Math.max(
          -maxOffset,
          Math.min(maxOffset, -deltaX)
        );
        setSlideOffset(clampedOffset);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startX || !startY) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = startX - endX;
      const deltaY = startY - endY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          setCurrentIndex((prev) =>
            Math.min(prev + 1, dynamicListData.length - 1)
          );
        } else {
          setCurrentIndex((prev) => Math.max(prev - 1, 0));
        }
      }

      setSlideOffset(0); // Reset swipe offset
      startX = 0;
      startY = 0;
    };

    document.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile]);

  // Add global mouse event handling
  useEffect(() => {
    if (!isMobile) return;

    const handleGlobalMouseUp = (e: MouseEvent) => {
      const container = document.querySelector('.mobile-card-container');
      if (!container) return;

      const startX = parseFloat(
        container.getAttribute('data-mouse-start-x') || '0'
      );
      const startY = parseFloat(
        container.getAttribute('data-mouse-start-y') || '0'
      );

      if (startX === 0) return;

      const deltaX = startX - e.clientX;
      const deltaY = startY - e.clientY;

      // Ensure it's a horizontal swipe and distance is sufficient
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          // Swipe left - next
          setCurrentIndex((prev) =>
            Math.min(prev + 1, dynamicListData.length - 1)
          );
        } else {
          // Swipe right - previous
          setCurrentIndex((prev) => Math.max(prev - 1, 0));
        }
      }

      // Reset swipe offset
      setSlideOffset(0);

      // Clear data
      container.removeAttribute('data-mouse-start-x');
      container.removeAttribute('data-mouse-start-y');
      container.removeAttribute('data-mouse-dragging');
    };

    // Add mouse down event to global
    const handleGlobalMouseDown = (e: MouseEvent) => {
      const container = document.querySelector('.mobile-card-container');
      if (!container) return;

      container.setAttribute('data-mouse-start-x', e.clientX.toString());
      container.setAttribute('data-mouse-start-y', e.clientY.toString());
      container.setAttribute('data-mouse-dragging', 'true');
    };

    // Add global mouse move event
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const container = document.querySelector('.mobile-card-container');
      if (!container) return;

      const isDragging =
        container.getAttribute('data-mouse-dragging') === 'true';
      if (!isDragging) return;

      const startX = parseFloat(
        container.getAttribute('data-mouse-start-x') || '0'
      );
      const startY = parseFloat(
        container.getAttribute('data-mouse-start-y') || '0'
      );

      if (startX === 0) return;

      const deltaX = startX - e.clientX;
      const deltaY = startY - e.clientY;

      // Only process if horizontal swipe distance is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        // Limit swipe range to prevent excessive swiping
        const maxOffset = window.innerWidth * 0.3;
        const clampedOffset = Math.max(
          -maxOffset,
          Math.min(maxOffset, -deltaX)
        );
        setSlideOffset(clampedOffset);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mousedown', handleGlobalMouseDown);
    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousedown', handleGlobalMouseDown);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isMobile]);

  // Reset index to 0 (for debugging)
  useEffect(() => {
    setCurrentIndex(0);
  }, []);

  return (
    <div className="flow-scroll-viewer">
      {/* Left indicator - only shown on desktop */}
      {!isMobile && (
        <div className="gradient-dots">
          {dynamicListData.map((_, index) => (
            <div
              key={index}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            ></div>
          ))}
        </div>
      )}

      {/* Main content area */}
      <div className="content-wrapper">
        {/* Mobile card layout */}
        {isMobile ? (
          <>
            <div
              className="mobile-card-container"
              style={{
                transform: `translateX(calc(${-currentIndex * 100}% + ${
                  -currentIndex * 30
                }px + ${slideOffset}px))`,
                transition:
                  slideOffset !== 0
                    ? 'none'
                    : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {dynamicListData.map((item, index) => (
                <div
                  key={index}
                  className={`mobile-card ${
                    index === currentIndex ? 'active' : ''
                  }`}
                  style={{
                    minWidth: '100%',
                    width: '100%',
                  }}
                >
                  {/* Image area */}
                  <div className="mobile-card-image">
                    <img
                      src={
                        item.image ||
                        'https://via.placeholder.com/430x526/3b82f6/ffffff?text=UI+Preview'
                      }
                      alt={`${item.title} Preview`}
                      width="430"
                      height="526"
                    />
                  </div>

                  {/* Text area */}
                  <div className="mobile-card-content">
                    <h3 className="mobile-card-title">{item.title}</h3>
                    <p className="mobile-card-description">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile indicators */}
            <div className="mobile-indicators">
              {dynamicListData.map((_, index) => (
                <div
                  key={index}
                  className={`mobile-indicator ${
                    index === currentIndex ? 'active' : ''
                  }`}
                  onClick={() => setCurrentIndex(index)}
                ></div>
              ))}
            </div>
          </>
        ) : (
          // Original desktop layout
          <>
            {/* Left text area */}
            <div className="text-section">
              {/* Feature list */}
              <div className="feature-list">
                {dynamicListData.map((item, index) => (
                  <div key={index}>
                    <div
                      className={`feature-item ${
                        index === currentIndex ? 'active' : ''
                      }`}
                      onClick={() => setCurrentIndex(index)}
                    >
                      {item.title}
                    </div>
                    {/* Description shown below specific title */}
                    {index === currentIndex && (
                      <div className="description-section">
                        <p className="main-description">{item.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right image display area */}
            <div className="ui-section">
              <div className="ui-image">
                <img
                  src={dynamicListData[currentIndex]?.image}
                  alt={`${dynamicListData[currentIndex]?.title} Preview`}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
