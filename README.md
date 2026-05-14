# CosmoLink GCS

2025 CanSat 대회를 위한 TEAM COSMOLINK 지상국(Ground Control Station) 데스크톱 애플리케이션입니다. Electron 기반 데스크톱 런타임에서 React + TypeScript UI를 실행하며, 시리얼 포트를 통해 CanSat과 통신하고 수신한 텔레메트리 데이터를 실시간 차트, 테이블, 명령 로그, CSV 파일로 관리합니다.

## 주요 기능

- **시리얼 포트 연결 관리**: PC에 연결된 시리얼 포트를 조회하고 9600 baud로 CanSat에 연결합니다.
- **실시간 텔레메트리 수신**: CanSat 패킷을 파싱하고 유효성 검사를 거친 뒤 앱 상태에 누적합니다.
- **차트/테이블 모니터링**: 고도, 온도, 전압, 압력, 가속도, 자이로, 자기계 데이터를 Chart.js 기반 그래프 또는 표로 확인합니다.
- **CMD ECHO 터미널**: 송신 명령과 수신 데이터를 UTC 시간 기준 로그로 확인하고 직접 명령을 입력할 수 있습니다.
- **미션 시간 설정**: 현재 UTC 시간 또는 CanSat GPS 시간으로 미션 시간을 동기화합니다.
- **시뮬레이션 모드**: TXT/CSV 시뮬레이션 파일을 읽어 `$` 팀 ID 플레이스홀더를 `3167`로 치환하고 1초 간격으로 SIMP 데이터를 전송합니다.
- **MEC/캘리브레이션 제어**: MEC ON/OFF 및 센서 캘리브레이션 명령을 UI에서 전송합니다.
- **CSV 저장 및 재시각화**: 텔레메트리 종료 시 CSV로 저장하고, 저장된 CSV를 2D/3D 차트로 다시 분석합니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Desktop Runtime | Electron, Electron Forge |
| Frontend | React 18, TypeScript, React Router |
| Styling | Tailwind CSS, global CSS, local font assets |
| Serial Communication | serialport, @serialport/parser-readline |
| Visualization | Chart.js, Plotly.js(3D CSV 시각화) |
| Build Tooling | react-scripts, yarn/npm scripts, webpack |

## 애플리케이션 구조

```text
2025_GCS
├── public
│   ├── electron.js          # Electron main process, IPC, serialport, CSV 저장
│   ├── preload.js           # Electron preload script
│   ├── css/global.css       # 전역 스타일 및 폰트 설정
│   ├── icons, favicons      # 앱 아이콘 리소스
│   └── index.html           # React 렌더러 진입 HTML
├── src
│   ├── App.tsx              # Provider 구성 및 라우팅
│   ├── component
│   │   ├── Main.tsx         # 메인 GCS 화면과 주요 제어 버튼
│   │   ├── Telemetry.tsx    # 실시간 차트/테이블 표시
│   │   ├── CmdEcho.tsx      # 명령 송수신 터미널
│   │   ├── CsvVisualizer.tsx# 저장 CSV 2D/3D 시각화 모달
│   │   └── MessageContext.tsx
│   ├── context              # 연결, 파일, 로딩, 앱 상태 Context
│   ├── hooks                # 시리얼, 텔레메트리, 시간, 시뮬레이션 로직
│   ├── constants/commands.ts# CanSat 명령어 상수
│   ├── services             # Electron IPC 접근 래퍼
│   └── types/mission.ts     # 텔레메트리 패킷 타입
├── forge.config.js          # Electron Forge 패키징 설정
├── package.json             # 실행/빌드/패키징 스크립트
└── tsconfig.json
```

## 데이터 흐름

1. 사용자가 포트를 선택하고 `CONNECT`를 누르면 렌더러가 `connect-port` IPC를 호출합니다.
2. Electron main process가 `SerialPort`를 열고 `ReadlineParser`로 줄 단위 데이터를 읽습니다.
3. 수신된 문자열은 `serial-data` IPC 이벤트로 React 렌더러에 전달됩니다.
4. `useSerial`이 패킷 필드 수, MODE, STATE, 시간 형식을 검증하고 `TelemetryData`로 변환합니다.
5. 유효한 패킷은 텔레메트리 배열에 누적되고, `Telemetry` 컴포넌트가 최근 50개 데이터를 차트로 표시합니다.
6. 모든 수신/송신 이벤트는 `MessageContext`를 통해 CMD ECHO 로그에 표시됩니다.
7. `STOP TELEMETRY` 실행 시 Electron의 `save-telemetry` IPC가 파일 저장 대화상자를 열고 CSV를 저장합니다.

## 텔레메트리 패킷 형식

수신 패킷은 쉼표로 구분된 25개 필드를 기준으로 파싱됩니다.

```text
TEAM_ID,MISSION_TIME,PACKET_COUNT,MODE,STATE,ALTITUDE,TEMPERATURE,PRESSURE,VOLTAGE,
GYRO_R,GYRO_P,GYRO_Y,ACCEL_R,ACCEL_P,ACCEL_Y,MAG_R,MAG_P,MAG_Y,
AUTO_GYRO_ROTATION_RATE,GPS_TIME,GPS_ALTITUDE,GPS_LATITUDE,GPS_LONGITUDE,GPS_SATS,CMD_ECHO
```

검증 규칙:

- 필드 수는 최소 25개여야 합니다.
- `MODE`는 `F` 또는 `S`만 허용합니다.
- `STATE`는 `LAUNCH_WAIT`, `LAUNCH_PAD`, `ASCENT`, `APOGEE`, `DESCENT`, `PROBE_RELEASE`, `LANDED` 중 하나여야 합니다.
- `MISSION_TIME`은 `hh:mm:ss` 형식이어야 합니다.
- GPS 좌표는 `DDMM.MMMM`/`DDDMM.MMMM` 형식이면 십진도 좌표로 변환됩니다.

## 지원 명령어

팀 ID는 코드상 `3167`로 고정되어 있습니다.

| 기능 | 명령어 |
| --- | --- |
| Telemetry 시작 | `CMD,3167,CX,ON` |
| Telemetry 중지 | `CMD,3167,CX,OFF` |
| GPS 시간 요청 | `CMD,3167,ST,GPS` |
| UTC 시간 설정 | `CMD,3167,ST,hh:mm:ss` |
| Simulation 활성화 | `CMD,3167,SIM,ENABLE` |
| Simulation 실행 | `CMD,3167,SIM,ACTIVATE` |
| Simulation 비활성화 | `CMD,3167,SIM,DISABLE` |
| Simulation pressure 전송 | `CMD,3167,SIMP,<pressure>` |
| 캘리브레이션 | `CMD,3167,CAL` |
| MEC ON | `CMD,3167,MEC,UC,ON` |
| MEC OFF | `CMD,3167,MEC,UC,OFF` |

## 실행 방법

### 1. 의존성 설치

```bash
yarn install
```

또는 npm을 사용할 경우:

```bash
npm install
```

### 2. 개발 모드 실행

React 개발 서버와 Electron 앱을 함께 실행합니다.

```bash
yarn dev
```

내부적으로 `react-scripts start`가 `127.0.0.1:3000`에서 실행되고, Electron이 해당 URL을 로드합니다.

### 3. React 단독 실행

```bash
yarn start
```

### 4. 테스트

```bash
yarn test
```

### 5. 프로덕션 빌드

```bash
yarn build
```

## 패키징

Electron Forge 설정은 `forge.config.js`에 있습니다. 앱 실행 파일명은 `CosmoLink`이며, Windows Squirrel installer와 macOS/Windows ZIP 패키지를 생성하도록 구성되어 있습니다.

```bash
# Windows 64-bit
npm run make-win64

# Windows 32-bit
npm run make-win32

# macOS
npm run make-mac

# 전체 빌드
npm run make-all
```

생성물은 `out/` 하위에 저장됩니다.

## CSV 시각화

`DATA VISUALIZATION` 메뉴에서는 저장된 텔레메트리 CSV를 불러와 다시 분석할 수 있습니다.

- 2D 선 그래프
- 2D 막대 그래프
- GPS 위도/경도와 고도 기반 3D 비행 궤적
- 선택 센서 값 기반 3D 데이터 그래프
- 차트 PNG 다운로드

3D 시각화는 런타임에 Plotly.js CDN을 로드합니다. 오프라인 환경에서 3D 기능이 필요하다면 Plotly.js를 로컬 의존성으로 포함하도록 변경해야 합니다.

## 시뮬레이션 파일

시뮬레이션 파일은 `.txt` 또는 `.csv`를 지원합니다.

- 빈 줄과 `#`로 시작하는 주석 라인은 무시됩니다.
- `$` 문자는 팀 ID `3167`로 치환됩니다.
- `SIM,ENABLE` 후 파일을 선택하고 `SIM,ACTIVATE`를 실행하면 1초 간격으로 각 줄을 전송합니다.
- 모든 데이터 전송이 끝나면 자동으로 `SIM,DISABLE` 흐름이 실행됩니다.

## 개발 참고 사항

- Electron main process는 `public/electron.js`에 있으며, renderer와 IPC로 통신합니다.
- 시리얼 포트 baud rate는 `9600`으로 설정되어 있습니다.
- `contextIsolation`은 `false`, `nodeIntegration`은 `true`로 설정되어 있어 Electron renderer에서 `window.require("electron")`을 사용합니다.
- 개발 중 DevTools가 자동으로 열리도록 `mainWindow.webContents.openDevTools()`가 호출됩니다.
- 패키징 시 `public/preload.js`는 `extraFiles`로 포함됩니다.

## 라이선스

이 프로젝트의 `package.json` 라이선스는 `ISC`로 설정되어 있으며, 저장소에는 `LICENSE` 파일이 포함되어 있습니다.
