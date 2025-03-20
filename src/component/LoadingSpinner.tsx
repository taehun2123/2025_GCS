import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = '데이터를 불러오는 중입니다...', 
  size = 'md',
  fullScreen = false 
}) => {
  // 크기에 따른 스타일 설정
  const spinnerSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-50' 
    : 'flex flex-col items-center justify-center p-4';

  return (
    <div className={containerClasses}>
      <div className={`${spinnerSizes[size]} animate-spin rounded-full border-4 border-blue-200 border-t-blue-900`}></div>
      {message && (
        <p className="mt-3 text-blue-900 font-medium text-center">{message}</p>
      )}
    </div>
  );
};