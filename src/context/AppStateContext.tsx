import React, { createContext, useState, useContext, ReactNode } from "react";

type AppStateContextType = {
  isMec: boolean;
  setIsMec: React.Dispatch<React.SetStateAction<boolean>>;
  isTelemetry: boolean;
  setIsTelemetry: React.Dispatch<React.SetStateAction<boolean>>;
  simStatus: "DISABLED" | "ENABLED" | "ACTIVE";
  setSimStatus: React.Dispatch<React.SetStateAction<"DISABLED" | "ENABLED" | "ACTIVE">>;
  activeTab: "telemetry" | "cmdecho";
  setActiveTab: React.Dispatch<React.SetStateAction<"telemetry" | "cmdecho">>;
  viewMode: "charts" | "table";
  setViewMode: React.Dispatch<React.SetStateAction<"charts" | "table">>;
};

const AppStateContext = createContext<AppStateContextType | undefined>(
  undefined
);

export const AppStateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isMec, setIsMec] = useState(false);
  const [isTelemetry, setIsTelemetry] = useState(false);
  const [simStatus, setSimStatus] = useState<"DISABLED" | "ENABLED" | "ACTIVE">("DISABLED");
  const [activeTab, setActiveTab] = useState<"telemetry" | "cmdecho">("telemetry");
  const [viewMode, setViewMode] = useState<"charts" | "table">("charts");

  return (
    <AppStateContext.Provider
      value={{
        isMec,
        setIsMec,
        isTelemetry,
        setIsTelemetry,
        simStatus,
        setSimStatus,
        activeTab,
        setActiveTab,
        viewMode,
        setViewMode,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return context;
};
