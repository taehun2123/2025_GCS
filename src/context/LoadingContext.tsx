import React, { createContext, useState, useContext, ReactNode, useRef, useEffect } from 'react';
import { LoadingSpinner } from 'component/LoadingSpinner';

// Context가 관리할 상태 타입
type LoadingState = {
  loading: boolean;
  message: string;
  visibleLoading: boolean;
  isLoadingRef: React.MutableRefObject<boolean>;
  timerRef: React.MutableRefObject<NodeJS.Timeout | null>;
  setLoading: (value: boolean) => void;
  setMessage: (message: string) => void;
  setVisibleLoading: (visible: boolean) => void;
};

// Context 생성
const LoadingContext = createContext<LoadingState | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
  delay?: number;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ 
  children, 
  delay = 500
}) => {
  // 상태 관리
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('데이터를 불러오는 중입니다...');
  const [visibleLoading, setVisibleLoading] = useState(false);
  
  // Ref 관리
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef(false);

  // 로딩 상태 변경 처리
  useEffect(() => {
    if (loading) {
      isLoadingRef.current = true;
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      timerRef.current = setTimeout(() => {
        if (isLoadingRef.current) {
          setVisibleLoading(true);
        }
      }, delay);
    } else {
      isLoadingRef.current = false;
      setVisibleLoading(false);
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [loading, delay]);

  // Context 값 정의 - 상태 및 상태 변경 함수만 포함
  const contextValue: LoadingState = {
    loading,
    message,
    visibleLoading,
    isLoadingRef,
    timerRef,
    setLoading,
    setMessage,
    setVisibleLoading
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      {visibleLoading && <LoadingSpinner message={message} fullScreen={true} />}
    </LoadingContext.Provider>
  );
};

export { LoadingContext };