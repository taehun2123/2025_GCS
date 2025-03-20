import React, { useEffect, useRef } from 'react';

interface FileInputDialogProps {
  isVisible: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDialogClose: () => void;
  accept?: string;
}

const FileInputDialog: React.FC<FileInputDialogProps> = ({ 
  isVisible, 
  onFileSelect, 
  onDialogClose,
  accept = ".txt" 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // visibility 변경 시 파일 다이얼로그 자동 열기
  useEffect(() => {
    if (isVisible && fileInputRef.current) {
      fileInputRef.current.click();
      // 즉시 상태 리셋하여 다음에도 같은 파일 선택 가능하게 함
      onDialogClose();
    }
  }, [isVisible, onDialogClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e);
    // 파일 선택 후 input 값 초기화 (같은 파일 재선택 가능하도록)
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleChange}
      className="hidden"
      accept={accept}
    />
  );
};

export default FileInputDialog;