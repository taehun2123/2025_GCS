import { createContext, useContext, useState } from "react";

interface SerialContextType {
  isConnected: boolean;
  setIsConnected: (value: boolean) => void;
  serialPorts: Array<{ path: string }>;
  setSerialPorts: (ports: Array<{ path: string }>) => void;
  selectedPort: string;
  setSelectedPort: (port: string) => void;
}

const SerialContext = createContext<SerialContextType | undefined>(undefined);

export const SerialProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [serialPorts, setSerialPorts] = useState<Array<{ path: string }>>([]);
  const [selectedPort, setSelectedPort] = useState("");

  const value = {
    isConnected,
    setIsConnected,
    serialPorts,
    setSerialPorts,
    selectedPort,
    setSelectedPort,
  };

  return (
    <SerialContext.Provider value={value}>
      {children}
    </SerialContext.Provider>
  );
};

export const useSerialContext = () => {
  const context = useContext(SerialContext);
  if (!context) {
    throw new Error("useSerialContext must be used within a SerialProvider");
  }
  return context;
};