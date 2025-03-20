import { useContext } from 'react';
import { LoadingContext } from 'context/LoadingContext';

// Hook이 제공할 인터페이스 타입
type LoadingHookInterface = {
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
};

export const useLoading = (): LoadingHookInterface => {
  const context = useContext(LoadingContext);
  
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  
  // 동작 함수 정의
  const showLoading = (customMessage?: string) => {
    if (customMessage) {
      context.setMessage(customMessage);
    }
    context.setLoading(true);
  };

  const hideLoading = () => {
    context.setLoading(false);
  };

  // 간결한 인터페이스 반환
  return {
    showLoading,
    hideLoading,
    isLoading: context.loading
  };
};