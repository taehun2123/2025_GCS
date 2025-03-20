import React, { useState, useEffect, useRef } from "react";
import { useMessages } from "./MessageContext";
import { CMD } from "constants/commands";
import { useSimulation } from "hooks/useSimulation";
import { useTimeControl } from "hooks/useTimeControl";
import { electronService } from "services/electronService";
import { useTelemetry } from "hooks/useTelemetry";
import { useMechanical } from "hooks/useMechanical";
import { useAppState } from "context/AppStateContext";
import { useSerialContext } from "context/SerialContext";

export const CmdEcho: React.FC = () => {
  const { messages, setMessages } = useMessages();
  const ipcRenderer = electronService.ipcRenderer;
  const { setIsMec, setIsTelemetry } = useAppState();

  // Custom Hooks
  const { isConnected } = useSerialContext();
  const useTel = useTelemetry();
  const useTime = useTimeControl();
  const useSim = useSimulation();
  const useMec = useMechanical();

  // 상태 관리
  const [input, setInput] = useState("");

  // 자동 스크롤을 위한 ref
  const messageEndRef = useRef<HTMLDivElement>(null);
  const cmd = CMD;

  const handleCalToZero = async () => {
    if (isConnected) {
      try {
        await ipcRenderer.invoke("send-data", cmd.CAL);
      } catch (error) {
        console.error("Failed to calibrate:", error);
        alert(
          `캘리브레이션 실패
  
          Calibration failed`
        );
      }
    }
  };

  // 현재 시간 문자열 가져오기 (setTime이 있으면 사용, 없으면 UTC 시간 사용)
  const getCurrentTimeString = () => {
    if (useTime.setTime && useTime.setTime.trim()) {
      return useTime.setTime;
    } else {
      const now = new Date();
      return `${String(now.getUTCHours()).padStart(2, "0")}:${String(
        now.getUTCMinutes()
      ).padStart(2, "0")}:${String(now.getUTCSeconds()).padStart(2, "0")}`;
    }
  };

  // 메시지 목록의 맨 아래로 스크롤
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 명령어 전송 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputedCMD = input.trim();

    if (inputedCMD) {
      // 유효한 명령어 목록 확인
      const validCommands = [
        cmd.TEL.ON,
        cmd.TEL.OFF,
        cmd.TIME.GPS,
        cmd.SIM.ENABLE,
        cmd.SIM.ACTIVATE,
        cmd.SIM.DISABLE,
        cmd.CAL,
        cmd.MEC.ON,
        cmd.MEC.OFF,
      ];

      // SIMP와 TIME.UTC 명령어는 접두사 확인
      const isValidSIMP = inputedCMD.startsWith(cmd.SIMP);
      const isValidTimeUTC =
        inputedCMD.startsWith(cmd.TIME.UTC) &&
        inputedCMD.length > cmd.TIME.UTC.length;

      // 유효한 명령어인지 확인
      const isValidCommand =
        validCommands.includes(inputedCMD) || isValidSIMP || isValidTimeUTC;

      if (!isValidCommand) {
        // 유효하지 않은 명령어일 경우 에러 메시지 출력
        const errorTimeString = getCurrentTimeString();
        setMessages((prev) => [
          ...prev,
          `[UTC ${errorTimeString}] Error: Invalid command.\n[UTC ${errorTimeString}] 오류: 유효하지 않은 명령어입니다.`,
        ]);
        setInput(""); // 입력 필드 초기화
        return;
      }

      try {
        switch (true) {
          case inputedCMD === cmd.TEL.ON:
            await useTel.handleStartTelemetry();
            setIsTelemetry(true);
            break;
          case inputedCMD === cmd.TEL.OFF:
            await useTel.handleStopTelemetry();
            setIsTelemetry(false);
            break;
          case inputedCMD === cmd.TIME.GPS:
            await useTime.handleSetGPSTime();
            break;
          case isValidTimeUTC:
            const timeValue = inputedCMD.substring(cmd.TIME.UTC.length);
            useTime.setInputedTime(timeValue);
            await useTime.handleSetUTCTime();
            break;
          case inputedCMD === cmd.SIM.ENABLE:
            await useSim.handleSimEnable();
            break;
          case inputedCMD === cmd.SIM.ACTIVATE:
            await useSim.handleSimActivate();
            break;
          case inputedCMD === cmd.SIM.DISABLE:
            useSim.handleSimDisable();
            break;
          case inputedCMD === cmd.CAL:
            handleCalToZero();
            break;
          case inputedCMD === cmd.MEC.ON:
            await useMec.sendMecCommand(true);
            setIsMec(true);
            break;
          case inputedCMD === cmd.MEC.OFF:
            await useMec.sendMecCommand(false);
            setIsMec(false);
            break;
          case isValidSIMP:
            const pressureValue = inputedCMD.substring(cmd.SIMP.length);
            await useSim.handleSendSimData(pressureValue);
            break;
        }

        setInput(""); // 입력 필드 초기화
      } catch (error) {
        console.error("명령어 처리 실패:", error);
        const errorTimeString = getCurrentTimeString();
        setMessages((prev) => [
          ...prev,
          `[UTC ${errorTimeString}] Error: Command processing failed.\n[UTC ${errorTimeString}] 오류: 명령어 처리 실패.`,
        ]);
      }
    }
  };

  // 메시지가 추가될 때마다 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    // 터미널 스타일 UI 구현 (중복 div 제거)
    <div className="w-full h-full flex flex-col bg-white text-black-400 font-mono border-2 border-blue-900 rounded-lg">
      {/* 메시지 표시 영역 */}
      <div className="flex-1 p-4 overflow-auto">
        {messages.map((msg, index) => (
          <div key={index} className="mb-2 whitespace-pre-wrap">
            {msg}
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      {/* 명령어 입력 폼 */}
      <form onSubmit={handleSubmit} className="p-4 bg-blue-900 rounded-b-lg">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full px-3 py-2 bg-white text-black-400 font-mono border border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="Enter command..."
        />
      </form>
    </div>
  );
};
