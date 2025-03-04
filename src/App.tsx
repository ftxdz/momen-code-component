import { BrowserRouter } from "react-router-dom";
import "./App.scss";
import { useRef } from "react";
import { ChatRoom } from "./components/ChatRoom/ChatRoom";


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
              width: "400px",
              height: "600px",
              backgroundColor: "white",
              borderRadius: "10px",
              overflow: "hidden",
              zIndex: 1
            }}
          >
            <ChatRoom 
              propData={{
                accountId: 1,
                isAssistant: false,   
                placeholder: '请输入消息...',
                conversationId: 11
              }}
              propState={{
                inputValue: '',
                fileList: []
              }}
              event={{
              }}
            />
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
