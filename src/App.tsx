import { BrowserRouter } from "react-router-dom";
import "./App.scss";
import { useRef } from "react";
import { SwipeScale } from "./components/SwipeScale/SwipeScale";


function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  
  return (
    <BrowserRouter>
      <div style={{ height: "100vh", width: "100%", backgroundColor: "black", display: "flex", flexDirection: "column" }}>
        {/* 测试内容区域 */}
        <div style={{ 
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          backgroundColor: "#222"
        }}>
          <div 
            data-comp-id="scalable-content"
            ref={contentRef}
            style={{
              width: "200px",
              height: "200px",
              backgroundColor: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "10px",
              transition: "transform 0.1s ease-out",
              transformOrigin: "center center",
              zIndex: 1
            }}
          >可缩放的内容
          </div>
        </div>
        
        {/* 滑动区域 */}
        <div style={{
          height: "100px",
          backgroundColor: "#333",
          position: "relative"
        }}>
          <SwipeScale
            propData={{ 
              targetCompId: "scalable-content",
              widthScale: 0,
              isScaled: false
            }}
            propState={{}}
            event={{}}
          />
          <div style={{ position: "absolute", left: "50%", top: "50%", color: "white", pointerEvents: "none" }}>
            ← 左滑缩小
          </div>
          
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
