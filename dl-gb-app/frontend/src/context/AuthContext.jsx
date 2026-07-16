import { createContext, useContext, useState } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("dl_gb_token"));
  const [username, setUsername] = useState(localStorage.getItem("dl_gb_username"));

  const login = async (username, password) => {
    const res = await client.post("/auth/login", { username, password });
    const { token, username: uname } = res.data;

    localStorage.setItem("dl_gb_token", token);
    localStorage.setItem("dl_gb_username", uname);
    setToken(token);
    setUsername(uname);
  };

  const logout = () => {
    localStorage.removeItem("dl_gb_token");
    localStorage.removeItem("dl_gb_username");
    setToken(null);
    setUsername(null);
  };

  const isLoggedIn = !!token;

  return (
    <AuthContext.Provider value={{ token, username, isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}