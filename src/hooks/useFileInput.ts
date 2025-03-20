// hooks/useFileInput.ts 수정 버전
import { useContext, useState } from 'react';
import { FileInputContext } from 'context/FileInputContext';
import { useLoading } from 'hooks/useLoading';

export const useFileInput = () => {
  const context = useContext(FileInputContext);
  const { showLoading, hideLoading } = useLoading();
  
  // 파일 선택 완료 후 호출할 콜백 함수 저장
  const [fileSelectCallback, setFileSelectCallback] = useState<((isValid: boolean) => void) | null>(null);
  
  if (!context) {
    throw new Error('useFileInput must be used within FileInputProvider');
  }
  
  // 파일 선택 처리 함수
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        showLoading("파일 로드 중...");
        
        // 파일 내용 읽기
        const text = await file.text();
        
        // 파일 정보 업데이트
        context.setSelectedFile(file);
        context.setFileContent(text);
        
        // 파일 유효성 검사
        const isValid = text.trim().length > 0;
        context.setHasValidFile(isValid);
        
        hideLoading();
        
        // 다이얼로그 상태 리셋
        context.setShowFileDialog(false);
        
        // 저장된 콜백 함수가 있으면 호출
        if (fileSelectCallback) {
          fileSelectCallback(isValid);
          setFileSelectCallback(null); // 콜백 사용 후 초기화
        }
        
        if (isValid) {
          alert("시뮬레이션 데이터 전송 준비가 완료되었습니다.\n\nSimulation data is ready to be transmitted.");
        }
        
        return { 
          file, 
          content: text,
          success: true,
          isValid
        };
      } catch (error) {
        console.error("Failed to load file:", error);
        hideLoading();
        context.setShowFileDialog(false);
        
        return {
          success: false,
          error
        };
      }
    }
    
    return {
      success: false,
      error: new Error("No file selected")
    };
  };
  
  // 파일 다이얼로그 열기
  const openFileDialog = (callback?: (isValid: boolean) => void) => {
    // 콜백 함수가 제공되면 저장
    if (callback) {
      setFileSelectCallback(callback);
    }
    context.setShowFileDialog(true);
  };
  
  // 파일 상태 리셋
  const resetFileInput = () => {
    context.setSelectedFile(null);
    context.setFileContent('');
    context.setHasValidFile(false);
    setFileSelectCallback(null); // 콜백도 초기화
  };
  
  // 파일 데이터 파싱 (시뮬레이션 전용)
  const parseSimulationFile = (content: string): string[] => {
    return content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => line.replace("$", "3167"));
  };

  return {
    ...context,
    handleFileSelect,
    openFileDialog,
    resetFileInput,
    parseSimulationFile
  };
};