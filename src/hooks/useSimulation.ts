import { useRef, useState, useEffect } from "react";
import { CMD } from "constants/commands";
import { useSerialContext } from "context/SerialContext";
import { electronService } from "services/electronService";
import { useAppState } from "context/AppStateContext";
import { useLoading } from "hooks/useLoading";
import { useFileInput } from "hooks/useFileInput";

// 모든 훅 인스턴스 간에 공유되는 전역 인터벌 참조
let globalIntervalRef: NodeJS.Timeout | null = null;

export const useSimulation = () => {
  const { simStatus, setSimStatus, setActiveTab } = useAppState();
  const { isConnected } = useSerialContext();
  const ipcRenderer = electronService.ipcRenderer;
  const { showLoading, hideLoading } = useLoading();

  // 파일 입력 관련 훅 사용
  const fileInput = useFileInput();

  const [simFile, setSimFile] = useState<string[]>([]);
  const [canReceiveSimData, setCanReceiveSimData] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const sim = CMD.SIM;
  const simp = CMD.SIMP;

  // 파일 내용이 변경될 때마다 시뮬레이션 데이터 업데이트
  useEffect(() => {
    if (fileInput.fileContent) {
      const commands = fileInput.parseSimulationFile(fileInput.fileContent);
      setSimFile(commands);
    }
  }, [fileInput.fileContent]);

  // 로컬 intervalRef를 globalIntervalRef와 동기화하는 효과
  useEffect(() => {
    // 로컬 참조를 전역 참조와 일치하도록 업데이트
    intervalRef.current = globalIntervalRef;
    
    // 컴포넌트가 언마운트될 때 인터벌을 정리하는 함수
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        globalIntervalRef = null;
        intervalRef.current = null;
      }
    };
  }, []);

  // SIMP 명령 실행을 위한 인터벌 핸들러
  const startSimulation = async () => {
    alert(
      "시뮬레이션 데이터 전송이 시작되었습니다.\n\nSimulation data transmission has started."
    );
    let index = 0;

    // 기존 인터벌이 있다면 정리
    if (intervalRef.current || globalIntervalRef) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (globalIntervalRef) clearInterval(globalIntervalRef);
      globalIntervalRef = null;
      intervalRef.current = null;
    }

    const interval = setInterval(async () => {
      if (index >= simFile.length) {
        if (interval) clearInterval(interval);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (globalIntervalRef) clearInterval(globalIntervalRef);
        
        globalIntervalRef = null;
        intervalRef.current = null;
        
        handleSimDisable(); // 모든 데이터 전송 후 자동 비활성화
        return;
      } 

      try {
        await ipcRenderer.invoke("send-data", simFile[index]);
        index++;
      } catch (error) {
        console.error("Failed to send simulation command:", error);
        
        if (interval) clearInterval(interval);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (globalIntervalRef) clearInterval(globalIntervalRef);
        
        globalIntervalRef = null;
        intervalRef.current = null;
      }
    }, 1000);

    // 인터벌 참조를 로컬과 전역 모두에 저장
    intervalRef.current = interval;
    globalIntervalRef = interval;
  };

  // 시뮬레이션 활성화
  const handleSimEnable = async () => {
    if (isConnected) {
      try {
        showLoading("시뮬레이션 모드 활성화 중...");

        // 명령 전송
        const response = await ipcRenderer.invoke("send-data", sim.ENABLE);
        console.log("Send data response:", response);

        // 파일 다이얼로그 표시와 콜백 등록
        fileInput.openFileDialog((isValid) => {
          // 파일 유효성 검사 결과에 따른 처리
          if (isValid) {
            // 유효한 파일이 선택된 경우 상태 업데이트
            setSimStatus("ENABLED");
            setActiveTab("cmdecho");
          }
        });
        setSimStatus("ENABLED");
        setActiveTab("cmdecho");

        hideLoading();
      } catch (error) {
        console.error("Failed to enable simulation:", error);
        hideLoading();
        alert("시뮬레이션 모드 활성화 실패");
      }
    }
  };

  const handleSimActivate = async () => {
    if (isConnected && fileInput.hasValidFile) {
      try {
        await ipcRenderer.invoke("send-data", sim.ACTIVATE);
        setSimStatus("ACTIVE");
        startSimulation();
      } catch (error) {
        console.error("Failed to activate simulation:", error);
        alert("시뮬레이션 실행 실패\n\nFailed to activate simulation");
      }
    }
  };

  // 시뮬레이션 모드 해제
  const handleSimDisable = async () => {
    if (isConnected) {
      try {
        await ipcRenderer.invoke("send-data", sim.DISABLE);
        fileInput.resetFileInput(); // 파일 입력 상태 리셋
        alert("시뮬레이션 모드가 종료됩니다.\n\nSimulation mode is ending.");
        setSimStatus("DISABLED");

        // 로컬 및 전역 참조를 모두 사용하여 인터벌 해제
        if (intervalRef.current || globalIntervalRef) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (globalIntervalRef) clearInterval(globalIntervalRef);
          globalIntervalRef = null;
          intervalRef.current = null;
        }
      } catch (error) {
        console.error("Failed to disable simulation:", error);
        alert("시뮬레이션 모드 비활성화 실패");
      }
    }
  };

  const handleSendSimData = async (pressureValue: string) => {
    if (isConnected && canReceiveSimData) {
      try {
        await ipcRenderer.invoke("send-data", `${simp}${pressureValue}`);
      } catch (error) {
        console.error("Failed to send simulation data:", error);
        alert("시뮬레이션 데이터 전송 실패");
      }
    }
  };

  // fileInput.handleFileSelect의 타입에 맞는 래퍼 함수
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    return fileInput.handleFileSelect(e);
  };

  return {
    simStatus,
    simFile,
    canReceiveSimData,
    setCanReceiveSimData,
    intervalRef,
    startSimulation,
    handleSimEnable,
    handleSimActivate,
    handleSimDisable,
    handleSendSimData,
    // 파일 관련 속성은 useFileInput에서 가져옴
    showFileDialog: fileInput.showFileDialog,
    setShowFileDialog: fileInput.setShowFileDialog,
    hasValidSimFile: fileInput.hasValidFile,
    handleFileUpload,  // 수정된 래퍼 함수
  };
};