import React, { createContext, useState, useContext, useEffect } from "react";
import { electronService } from "services/electronService";

// 최대 메시지 수 상수 (메모리 관리를 위함)
const MAX_MESSAGES = 500;

type MessageContextType = {
  messages: string[];
  setMessages: React.Dispatch<React.SetStateAction<string[]>>;
  clearMessages: () => void;
  getCurrentTimeString: () => string; // 시간 문자열 생성 함수 추가
};

// Context 생성
const MessageContext = createContext<MessageContextType | undefined>(undefined);

// 현재 UTC 시간 문자열 가져오기 (Helper 함수)
const getUTCTimeString = () => {
  const now = new Date();
  return `${String(now.getUTCHours()).padStart(2, "0")}:${String(
    now.getUTCMinutes()
  ).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`;
};

export const MessageProvider: React.FC<{
  children: React.ReactNode;
  // setTime을 직접 props로 받음
  setTime?: string;
}> = ({ children, setTime }) => {
  const ipcRenderer = electronService.ipcRenderer;
  const [messages, setMessages] = useState<string[]>([]);

  // 시간 문자열 생성 함수 - setTime이 있으면 사용, 없으면 UTC 시간 사용
  const getCurrentTimeString = () => {
    if (setTime && setTime.trim()) {
      return setTime;
    } else {
      return getUTCTimeString();
    }
  };

  // 메시지 클리어 함수
  const clearMessages = () => {
    setMessages([]);
  };

  // 메시지 제한 관리: 최대 개수 초과 시 오래된 메시지 제거
  const addMessage = (newMessage: string) => {
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages, newMessage];
      if (updatedMessages.length > MAX_MESSAGES) {
        // 최대 개수 초과 시 가장 오래된 메시지 일부 제거
        return updatedMessages.slice(updatedMessages.length - MAX_MESSAGES);
      }
      return updatedMessages;
    });
  };

  useEffect(() => {
    // 시리얼 데이터 수신 이벤트 처리
    const handleSerialData = (_event: any, data: string) => {
      const timeString = getCurrentTimeString();
      console.log(`Received Data: ${data}`); // DEBUF 
      addMessage(`[UTC ${timeString}] RX: ${data}`);
    };

    // 시리얼 데이터 송신 이벤트 처리
    const handleSentData = (_event: any, data: string) => {
      const timeString = getCurrentTimeString();
      console.log(`Sent Data: ${data}`); // DEBUG
      addMessage(`[UTC ${timeString}] TX: ${data}`);
    };

    // 이벤트 리스너 등록
    if (ipcRenderer) {
      ipcRenderer.on("serial-data", handleSerialData);
      ipcRenderer.on("serial-sent", handleSentData);

      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        ipcRenderer.removeListener("serial-data", handleSerialData);
        ipcRenderer.removeListener("serial-sent", handleSentData);
      };
    }

    return undefined;
  }, [ipcRenderer, setTime]); // setTime이 변경될 때도 useEffect 재실행

  return (
    <MessageContext.Provider
      value={{
        messages,
        setMessages,
        clearMessages,
        getCurrentTimeString,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context)
    throw new Error("useMessages must be used within MessageProvider");
  return context;
};
