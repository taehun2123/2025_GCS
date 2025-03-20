const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
const fs = require('fs');

// 개발 환경 체크
const isDev = process.env.ELECTRON_START_URL ? true : false;
let mainWindow = null;
let port = null;

// 메인 윈도우 생성 함수
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  // 개발/프로덕션 환경에 따른 URL 로드
  mainWindow.loadURL(
    isDev
      ? process.env.ELECTRON_START_URL
      : `file://${path.join(__dirname, "../build/index.html")}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

const { dialog } = require('electron');

// 텔레메트리 데이터 저장 핸들러
ipcMain.handle('save-telemetry', async (event, data) => {
  try {
    // 파일 저장 위치 묻기
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.join(app.getPath('downloads'), 'Flight_3167.csv'),
      filters: [
        { name: 'CSV Files', extensions: ['csv'] }
      ]
    });

    // 사용자에게 경로를 물어보고, 경로가 선택되지 않은 경우 종료
    if (result.canceled || !result.filePath) {
      console.log('File save canceled');
      return { success: false, message: 'File save canceled' };
    }

    // CSV 헤더 정의
    const headers = [
      'TEAM_ID', 'MISSION_TIME', 'PACKET_COUNT', 'MODE', 'STATE',
      'ALTITUDE', 'TEMPERATURE', 'PRESSURE', 'VOLTAGE',
      'GYRO_R', 'GYRO_P', 'GYRO_Y',
      'ACCEL_R', 'ACCEL_P', 'ACCEL_Y',
      'MAG_R', 'MAG_P', 'MAG_Y',
      'AUTO_GYRO_ROTATION_RATE',
      'GPS_TIME', 'GPS_ALTITUDE', 'GPS_LATITUDE', 'GPS_LONGITUDE', 'GPS_SATS',
      'CMD_ECHO'
    ].join(',');

    // 데이터 행 변환
    const rows = data.map(item => {
      return [
        item.TEAM_ID, item.MISSION_TIME, item.PACKET_COUNT, item.MODE, item.STATE,
        item.ALTITUDE, item.TEMPERATURE, item.PRESSURE, item.VOLTAGE,
        item.GYRO_R, item.GYRO_P, item.GYRO_Y,
        item.ACCEL_R, item.ACCEL_P, item.ACCEL_Y,
        item.MAG_R, item.MAG_P, item.MAG_Y,
        item.AUTO_GYRO_ROTATION_RATE,
        item.GPS_TIME, item.GPS_ALTITUDE, item.GPS_LATITUDE, item.GPS_LONGITUDE, item.GPS_SATS,
        item.CMD_ECHO
      ].join(',');
    });

    // CSV 파일 작성
    const csvContent = [headers, ...rows].join('\n');
    await fs.promises.writeFile(result.filePath, csvContent);

    console.log(`Telemetry data saved successfully to: ${result.filePath}`);
    return { success: true, filePath: result.filePath };
  } catch (error) {
    console.error('Error saving telemetry data:', error);
    return { success: false, error: error.message };
  }
});

// 포트 상태 확인 핸들러
ipcMain.handle("check-port-status", () => {
  return {
    isConnected: port !== null && port.isOpen,
    currentPort: port?.path || null
  };
});

// 사용 가능한 포트 목록 조회 핸들러
ipcMain.handle("get-ports", async () => {
  try {
    const ports = await SerialPort.list();
    console.log('Available ports:', ports);
    return ports;
  } catch (error) {
    console.error("Error listing ports:", error);
    return [];
  }
});

// 시리얼 포트 연결 핸들러
ipcMain.handle("connect-port", async (event, portPath) => {
  try {
    if (!portPath) {
      throw new Error("포트를 선택해주세요");
    }

    // 기존 연결 처리
    if (port && port.isOpen) {
      if (port.path === portPath) {
        console.log('Already connected to port:', portPath);
        return { success: true };
      }
      console.log('Closing existing port connection');
      await new Promise((resolve) => port.close(resolve));
    }

    // 새 포트 연결 설정
    port = new SerialPort({
      path: portPath,
      baudRate: 9600,
    });
    
    // 데이터 파서 설정
    const parser = port.pipe(new ReadlineParser());
    parser.on("data", (message) => {
      console.log("Received data:", message);
      mainWindow.webContents.send("serial-data", message);
    });

    // 에러 핸들링
    port.on("error", (err) => {
      console.error("Serial port error:", err);
      mainWindow.webContents.send("serial-error", err.message);
    });

    console.log('Successfully connected to port:', portPath);
    return { success: true };
  } catch (error) {
    console.error('Port connection error:', error);
    return { success: false, error: error.message };
  }
});

// 포트 연결 해제 핸들러
ipcMain.handle('disconnect-port', async () => {
  if (!port) {
    return { success: true };
  }

  return new Promise((resolve) => {
    port.close((err) => {
      if (err) {
        console.error('Error closing port:', err);
      }
      port.removeAllListeners();
      port = null;
      console.log('Port disconnected successfully');
      resolve({ success: true });
    });
  });
});

// 데이터 전송 핸들러
ipcMain.handle('send-data', async (event, data) => {
  if (!port || !port.isOpen) {
    console.error('Cannot send data: Port not connected');
    return { success: false, error: 'Port not connected' };
  }
  try {
    port.write(`${data}\r\n`);
    console.log('Data sent:', data);
    mainWindow.webContents.send('serial-sent', data);
    // ts 파일 import가 불가능하여 직접 대조
    if (data === "CMD,3167,ST,GPS") {
      // GPS 응답을 받을 때까지 기다림
      return new Promise((resolve, reject) => {
        port.once('data', (response) => {
          try {
            const gpsTime = response.toString().trim(); // 응답을 문자열로 변환
            console.log("Response GPS Time: ", gpsTime);
            // 시간 포맷을 체크하거나 응답 형식에 맞게 처리
            if (/^\d{2}:\d{2}:\d{2}$/.test(gpsTime)) {
              console.log('Received GPS time:', gpsTime);
              resolve({ success: true, gpsTime: gpsTime }); // GPS 시간 반환
            } else {
              reject(new Error('Invalid GPS time format'));
            }
          } catch (error) {
            reject(error);
          }
        });

        // 일정 시간 내에 응답이 오지 않으면 에러 처리 (타임아웃)
        setTimeout(() => {
          reject(new Error('GPS time response timeout'));
        }, 5000); // 5초 동안 응답이 없으면 타임아웃
      });
    } else {
      // 일반 명령은 success만 반환
      return { success: true };
    }
  } catch (error) {
    console.error('Error sending data:', error);
    return { success: false, error: error.message };
  }
});

// 앱 라이프사이클 이벤트 핸들러
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", async () => {
  if (port && port.isOpen) {
    await new Promise((resolve) => port.close(resolve));
    console.log('Port closed on application quit');
  }
});