import React, { useState, useEffect, useRef } from "react";
import logo from "../static/images/cosmoLink.jpeg";
import { Telemetry } from "./Telemetry";
import { CmdEcho } from "./CmdEcho";
import { useSerial } from "hooks/useSerial";
import { CMD } from "constants/commands";
import { useTelemetry } from "hooks/useTelemetry";
import { useTimeControl } from "hooks/useTimeControl";
import { useSimulation } from "hooks/useSimulation";
import { useSerialContext } from "context/SerialContext";
import { MissionTime } from "./MissionTime";
import { electronService } from "services/electronService";
import { useAppState } from "context/AppStateContext";
import FileInputDialog from "./FileInputDialog";
import { useFileInput } from "hooks/useFileInput";

const Main: React.FC = () => {
  // 중앙 서비스
  const { isConnected, setIsConnected } = useSerialContext();
  const ipcRenderer = electronService.ipcRenderer;

  // Custom Hooks
  const serialHk = useSerial();
  const useTel = useTelemetry();
  const useTime = useTimeControl();
  const useSim = useSimulation();
  const useFile = useFileInput();

  const {
    isMec,
    setIsMec,
    isTelemetry,
    setIsTelemetry,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
  } = useAppState();

  // constants 변수
  const cmd = CMD;

  const handleToggleMEC = async () => {
    if (isConnected) {
      console.log(`mec status: ${isMec}`);
      try {
        if (!isMec) {
          await ipcRenderer.invoke("send-data", cmd.MEC.ON);
          setIsMec(true);
        } else {
          await ipcRenderer.invoke("send-data", cmd.MEC.OFF);
          setIsMec(false);
        }
      } catch (error) {
        console.error("Failed to toggle MEC:", error);
        alert(`MEC 상태 변경 실패\n\nFailed to toggle MEC state`);
      }
    }
  };

  const handleToggleTelemetry = async () => {
    if (isConnected) {
      console.log(`telemetry status: ${isTelemetry}`);
      try {
        if (!isTelemetry) {
          useTel.handleStartTelemetry();
          setIsTelemetry(true);
        } else {
          useTel.handleStopTelemetry();
          setIsTelemetry(false);
        }
      } catch (error) {
        console.error("Failed to toggle TELEMETRY:", error);
        alert(`TELEMETRY 상태 변경 실패\n\nFailed to toggle TELEMETRY state`);
      }
    }
  };

  useEffect(() => {
    const getPorts = async () => {
      try {
        const portStatus = await ipcRenderer.invoke("check-port-status");

        if (portStatus.isConnected) {
          setIsConnected(true);
          serialHk.setSelectedPort(portStatus.currentPort);
        }

        const ports = await ipcRenderer.invoke("get-ports");
        serialHk.setSerialPorts(ports);
      } catch (error) {
        console.error("Failed to get port status:", error);
      }
    };

    getPorts();

    ipcRenderer.on(
      "serial-data",
      serialHk.handleSerialData(useTel.telemetryData, useTel.setTelemetryData)
    );
    ipcRenderer.on("serial-error", serialHk.handleSerialError);

    return () => {
      ipcRenderer.removeAllListeners("serial-data");
      ipcRenderer.removeAllListeners("serial-error");
    };
  }, []);

  const handleConnectToCanSat = async () => {
    if (!isConnected && serialHk.selectedPort) {
      try {
        const portStatus = await ipcRenderer.invoke("check-port-status");
        if (
          portStatus.isConnected &&
          portStatus.currentPort !== serialHk.selectedPort
        ) {
          // alert: 이미 다른 포트(현재포트 번호 출력)가 연결되어 있습니다.
          alert(
            `Another port (${portStatus.currentPort}) is already connected`
          );
          setIsConnected(true);
          serialHk.setSelectedPort(portStatus.currentPort);
          return;
        }
        const result = await ipcRenderer.invoke(
          "connect-port",
          serialHk.selectedPort
        );
        if (result.success) {
          setIsConnected(true);
          serialHk.setSelectedPort(serialHk.selectedPort);
        } else {
          // alert: 연결 실패: 에러 메시지 출력
          alert(`Connection failed: ${result.error}`);
        }
      } catch (error) {
        console.error("Connection error:", error);
        // alert: 연결 중 오류가 발생했습니다.
        alert("An error occurred during connection");
      }
    } else if (isConnected) {
      try {
        const result = await ipcRenderer.invoke("disconnect-port");
        if (result.success) {
          setIsConnected(false);
          serialHk.setSelectedPort("");
          const ports = await ipcRenderer.invoke("get-ports");
          serialHk.setSerialPorts(ports);
        } else {
          // alert: 연결 해제 실패
          alert("Failed to disconnect");
        }
      } catch (error) {
        console.error("Disconnection error:", error);
        // alert: 연결 해제 중 오류가 발생했습니다.
        alert("An error occurred during disconnection");
      }
    }
  };

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

  const renderTabContent = () => {
    switch (activeTab) {
      case "telemetry":
        return (
          <Telemetry viewMode={viewMode} missionData={useTel.telemetryData} />
        );
      case "cmdecho":
        return <CmdEcho />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-200 font-sans overflow-hidden">
      <header className="flex items-center px-8 py-2 bg-white border-b border-gray-300 h-[70px]">
        <img src={logo} alt="SAMMARD" className="w-[50px] h-[50px] mr-8" />
        <h1 className="text-blue-900 text-3xl m-0 flex-grow text-center">
          TEAM COSMOLINK
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={serialHk.selectedPort}
            onChange={(e) => serialHk.setSelectedPort(e.target.value)}
            className="px-2 py-1 border rounded"
            disabled={isConnected}
          >
            <option value="">포트 선택</option>
            {serialHk.serialPorts.map((port) => (
              <option key={port.path} value={port.path}>
                {port.path}
              </option>
            ))}
          </select>
          <button
            onClick={handleConnectToCanSat}
            className={`px-4 py-1 rounded text-white font-bold hover:bg-blue-800 ${
              isConnected ? "bg-red-600 hover:bg-red-700" : "bg-blue-900"
            }`}
          >
            {isConnected ? "DISCONNECT" : "CONNECT"}
          </button>
        </div>
        <p className="text-blue-900 text-lg m-0 ml-4">TEAM ID:3167</p>
      </header>

      <div className="flex justify-between items-center px-8 py-2 bg-gray-100 border-b border-gray-300 h-[50px]">
        <div className="flex flex-row justify-center items-center gap-4">
          <span>MISSION TIME</span>
          <MissionTime setTime={useTime.setTime} />
        </div>

        <div className="flex gap-4">
          {!useTime.isToggleTime && (
            <button
              className="px-4 py-2 rounded bg-blue-900 text-white font-bold hover:bg-blue-800"
              disabled={!isConnected}
              onClick={useTime.handleToggleTime}
            >
              SET TIME
            </button>
          )}
          {/* SET TIME 활성화 시 View */}
          {useTime.isToggleTime && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => useTime.setIsToggleTime(false)}
                className="px-3 py-2 text-white bg-gray-400 hover:bg-red-500 active:bg-red-600 transition-colors duration-200 font-bold rounded"
              >
                ✖
              </button>
              {/* 시간 입력 form */}
              <form onSubmit={(e) => e.preventDefault()} className="flex-1">
                <input
                  type="text"
                  onChange={useTime.handleTimeInputChange}
                  value={useTime.inputedTime}
                  placeholder="hh:mm:ss"
                  maxLength={8}
                  className="w-full px-3 py-2 rounded border border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent placeholder-gray-400 font-mono"
                />
              </form>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all duration-200 shadow-md"
                disabled={!isConnected}
                onClick={useTime.handleSetUTCTime}
              >
                SET UTC TIME
              </button>
              <button
                className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-500 transition-all duration-200 shadow-md"
                disabled={!isConnected}
                onClick={useTime.handleSetGPSTime}
              >
                SET GPS TIME
              </button>
            </div>
          )}
          <button
            className="px-4 py-2 rounded bg-blue-900 text-white font-bold hover:bg-blue-800"
            disabled={!isConnected}
            onClick={handleCalToZero}
          >
            CALIBRATE
          </button>
          <button
            className={`px-4 py-1 rounded text-white font-bold hover:bg-blue-800 ${
              isMec ? "bg-red-600 hover:bg-red-700" : "bg-blue-900"
            }`}
            disabled={!isConnected}
            onClick={handleToggleMEC}
          >
            {isMec ? "MEC OFF" : "MEC ON"}
          </button>
          <button
            className={`px-4 py-1 rounded text-white font-bold hover:bg-blue-800 ${
              isTelemetry ? "bg-red-600 hover:bg-red-700" : "bg-blue-900"
            }`}
            disabled={!isConnected}
            onClick={handleToggleTelemetry}
          >
            {isTelemetry ? "STOP TELEMETRY" : "START TELEMETRY"}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span>PACKET COUNT</span>
          <span>: {useTel.telemetryData.length}</span>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col min-h-0">
        <div className="flex gap-0.5 mb-2">
          {[
            { id: "telemetry", label: "TELEMETRY" },
            { id: "cmdecho", label: "CMD ECHO" },
          ].map((tab) => (
            <div
              key={tab.id}
              className={`px-8 py-2 bg-white border-b-[3px] cursor-pointer ${
                activeTab === tab.id
                  ? "border-blue-900 text-blue-900 font-bold"
                  : "border-transparent"
              }`}
              onClick={() => setActiveTab(tab.id as "telemetry" | "cmdecho")}
            >
              {tab.label}
            </div>
          ))}
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          <div className="flex-1 bg-white rounded-lg shadow-md p-4 flex min-h-0">
            {renderTabContent()}
          </div>

          <div className="w-[250px] bg-white p-4 rounded-lg shadow-md flex flex-col">
            {activeTab != "cmdecho" && (
              <>
                <button
                  className={`w-full p-2 mb-2 rounded cursor-pointer ${
                    viewMode === "charts"
                      ? "bg-blue-900 text-white"
                      : "bg-gray-100"
                  }`}
                  onClick={() => setViewMode("charts")}
                >
                  CHARTS
                </button>
                <button
                  className={`w-full p-2 mb-2 rounded cursor-pointer ${
                    viewMode === "table"
                      ? "bg-blue-900 text-white"
                      : "bg-gray-100"
                  }`}
                  onClick={() => setViewMode("table")}
                >
                  TABLE
                </button>
              </>
            )}
            <div className="mt-2">
              <div className="flex flex-col justify-center items-center bg-gray-100 p-4 gap-2">
                <p className="m-0">SIMULATION MODE</p>
                <p className="font-bold m-0">{useSim.simStatus}</p>
                <div className="flex gap-1">
                  {/* 파일 다이얼로그 컴포넌트 */}
                  <FileInputDialog
                    isVisible={useSim.showFileDialog}
                    onFileSelect={useFile.handleFileSelect} // 함수 참조를 전달 (함수 호출이 아님)
                    onDialogClose={() => useSim.setShowFileDialog(false)}
                  />
                  <button
                    className={`flex-1 p-2 rounded cursor-pointer text-sm ${
                      useSim.simStatus === "ENABLED"
                        ? "bg-blue-900 text-white"
                        : "bg-gray-100"
                    }`}
                    onClick={useSim.handleSimEnable}
                    disabled={!isConnected}
                  >
                    ENABLE
                  </button>
                  <button
                    className={`flex-1 p-2 rounded cursor-pointer text-sm ${
                      useSim.simStatus === "ACTIVE"
                        ? "bg-blue-900 text-white"
                        : "bg-gray-100"
                    }`}
                    onClick={useSim.handleSimActivate}
                    disabled={
                      !isConnected ||
                      !useSim.hasValidSimFile ||
                      useSim.simStatus !== "ENABLED"
                    }
                  >
                    ACTIVATE
                  </button>
                  <button
                    className={`flex-1 p-2 rounded cursor-pointer text-sm ${
                      useSim.simStatus === "DISABLED"
                        ? "bg-blue-900 text-white"
                        : "bg-gray-100"
                    }`}
                    onClick={useSim.handleSimDisable}
                    disabled={!isConnected}
                  >
                    DISABLE
                  </button>
                </div>
              </div>

              <div className="text-sm p-2">
                {[
                  ["STATE:", isConnected ? "CONNECTED" : "DISCONNECTED"],
                  [
                    "GPS TIME:",
                    useTel.telemetryData[useTel.telemetryData.length - 1]
                      ?.GPS_TIME || "null",
                  ],
                  [
                    "GPS LATITUDE:",
                    useTel.telemetryData[useTel.telemetryData.length - 1]
                      ?.GPS_LATITUDE || "null",
                  ],
                  [
                    "GPS LONGITUDE:",
                    useTel.telemetryData[useTel.telemetryData.length - 1]
                      ?.GPS_LONGITUDE || "null",
                  ],
                  [
                    "GPS ALTITUDE:",
                    useTel.telemetryData[useTel.telemetryData.length - 1]
                      ?.GPS_ALTITUDE || "null",
                  ],
                  [
                    "GPS SATS:",
                    useTel.telemetryData[useTel.telemetryData.length - 1]
                      ?.GPS_SATS || "null",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between mb-2 pb-2 border-b border-gray-200"
                  >
                    <span className="text-blue-900 font-bold">{label}</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main;
