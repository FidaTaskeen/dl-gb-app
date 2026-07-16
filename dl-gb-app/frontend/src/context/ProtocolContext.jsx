import { createContext, useContext, useState, useEffect } from "react";

const ProtocolContext = createContext(null);

export function ProtocolProvider({ children }) {
  const [protocol, setProtocolState] = useState(
    () => localStorage.getItem("dl_gb_protocol") || "Modbus"
  );

  useEffect(() => {
    localStorage.setItem("dl_gb_protocol", protocol);
  }, [protocol]);

  const setProtocol = (value) => setProtocolState(value);

  return (
    <ProtocolContext.Provider value={{ protocol, setProtocol }}>
      {children}
    </ProtocolContext.Provider>
  );
}

export function useProtocol() {
  return useContext(ProtocolContext);
}