import axios from "axios";

const client = axios.create({
  baseURL: "https://dl-gb-backend.onrender.com/api",
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("dl_gb_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;