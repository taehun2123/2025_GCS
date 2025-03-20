import { useState } from "react";
import { TelemetryData } from "types/mission";
import { CMD } from "constants/commands";
import { useSerialContext } from "context/SerialContext";
import { electronService } from "services/electronService";
import { useLoading } from "./useLoading";

export const useTelemetry = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const { isConnected } = useSerialContext();
  const ipcRenderer = electronService.ipcRenderer;
  const { showLoading, hideLoading } = useLoading(); // 로딩 상태 관리

  const cmd = CMD;

  const handleStartTelemetry = async () => {
    if (isConnected) {
      try {
        // 로딩 화면 표시
        showLoading();

        // serial 통신 시작
        await ipcRenderer.invoke("send-data", cmd.TEL.ON);

        // 로딩 화면 숨김
        hideLoading();
      } catch (error) {
        console.error("Failed to start telemetry:", error);
        alert("원격측정 시작 실패");
      }
    } else {
      alert("시리얼 포트에 연결되어 있지 않습니다.");
    }
  };

  const handleStopTelemetry = async () => {
    if (isConnected) {
      try {
        // 로딩 화면 표시
        showLoading();

        // serial 통신 시작
        await ipcRenderer.invoke("send-data", cmd.TEL.OFF);

        // 로딩 화면 숨김
        hideLoading();
        const saveResult = await ipcRenderer.invoke(
          "save-telemetry",
          telemetryData
        );

        if (saveResult.success) {
          alert(
            `원격측정 데이터가 저장되었습니다.\nRemote telemetry-data is stored.\n\n저장 위치(Saved-Path): ${saveResult.filePath}`
          );
        } else {
          console.error("원격측정 데이터 저장 실패:", saveResult.error);
          alert("원격측정 데이터 저장 실패\n\nTelemetry data storage failure");
        }
      } catch (error) {
        console.error("원격측정 중지 실패:", error);
        alert("원격측정 중지 실패\nFailed to stop telemetry");
      }
    }
  };

  return {
    telemetryData,
    setTelemetryData,
    handleStartTelemetry,
    handleStopTelemetry,
  };
};
