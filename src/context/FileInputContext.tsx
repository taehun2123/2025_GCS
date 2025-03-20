import React, { createContext, useState, useContext, ReactNode } from 'react';

// 파일 입력 관련 상태 타입
type FileInputState = {
  showFileDialog: boolean;        // 파일 선택 다이얼로그의 표시 여부를 나타내는 상태
  selectedFile: File | null;      // 사용자가 선택한 파일 객체를 저장하는 상태 (선택된 파일이 없으면 null)
  fileContent: string;            // 선택한 파일의 내용(텍스트)을 저장하는 상태
  hasValidFile: boolean;          // 선택한 파일이 유효한지 여부를 나타내는 상태 (파싱 가능한 내용이 있으면 true)
  setShowFileDialog: (show: boolean) => void;        // 파일 다이얼로그 표시 상태를 변경하는 함수
  setSelectedFile: (file: File | null) => void;      // 선택된 파일 객체를 업데이트하는 함수
  setFileContent: (content: string) => void;         // 파일 내용을 업데이트하는 함수
  setHasValidFile: (valid: boolean) => void;         // 파일 유효성 상태를 업데이트하는 함수
};
// 기본값 (undefined로 설정하고 Provider 내에서 실제 값 제공)
const FileInputContext = createContext<FileInputState | undefined>(undefined);

interface FileInputProviderProps {
  children: ReactNode;
}

export const FileInputProvider: React.FC<FileInputProviderProps> = ({ children }) => {
  // 파일 입력 관련 상태
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [hasValidFile, setHasValidFile] = useState(false);
  
  // Provider에 전달할 값
  const contextValue: FileInputState = {
    showFileDialog,
    selectedFile,
    fileContent,
    hasValidFile,
    setShowFileDialog,
    setSelectedFile,
    setFileContent,
    setHasValidFile
  };

  return (
    <FileInputContext.Provider value={contextValue}>
      {children}
    </FileInputContext.Provider>
  );
};
// Context 객체 내보내기
export { FileInputContext };