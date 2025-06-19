import { BrowserRouter } from "react-router-dom";
import "./App.scss";
import { useState } from "react";
import { SalesDashboard } from "./components/SalesDashboard/SalesDashboard";

//import { ChatRoom } from "./components/ChatRoom/ChatRoom";

function App() {
  const [selectedDate] = useState('2024-03-20'); // 设置一个初始日期

  return (
    // <BrowserRouter>
    //   <div style={{ height: "100vh", width: "100%", backgroundColor: "black", display: "flex", flexDirection: "column" }}>
    //     {/* 测试内容区域 */}
    //     <div style={{
    //       flex: 1,
    //       display: "flex",
    //       justifyContent: "center",
    //       alignItems: "center",
    //       position: "relative",
    //       overflow: "hidden",
    //       backgroundColor: "#222"
    //     }}>
    //       <div
    //         data-comp-id="scalable-content"
    //         ref={contentRef}
    //         style={{
    //           width: "400px",
    //           height: "600px",
    //           backgroundColor: "white",
    //           borderRadius: "10px",
    //           overflow: "hidden",
    //           zIndex: 1
    //         }}
    //       >
    //         <ChatRoom
    //           propData={{
    //             accountId: 1,
    //             isMomenAI: false,
    //             placeholder: '请输入消息...',
    //             conversationId: 11
    //           }}
    //           propState={{

    //           }}
    //           event={{
    //           }}
    //         />
    //       </div>
    //     </div>
    //   </div>
    // </BrowserRouter>
    <BrowserRouter>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          padding: "24px",
          maxWidth: "1200px",
          margin: "0 auto",
          backgroundColor: "#fafafa",
          minHeight: "100vh"
        }}
      >
        <div style={{ 
          height: "700px", 
          backgroundColor: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          padding: "20px" // 添加内边距
        }}>
          
        </div>
        <SalesDashboard
          propData={{
            selectedDate,
          }}
          propState={{}}
          event={{}}
        />
      </div>
    </BrowserRouter>
  );
}

export default App;
