import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f69c00, #DDE3E8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="panel panel-accent" style={{ width: "100%", maxWidth: 420 }}>
        <h2 style={{ fontSize: 80, marginTop: 0, marginBottom: 8 }}>Welcome </h2>
        <p style={{ color: "#ed8e3a", fontWeight: 1000, marginBottom: 52 }}>DL / GB Inspection System</p>
        <form onSubmit={handleSubmit}>
          <label style={{ fontWeight: 900, fontSize: 20, display: "block", marginBottom: 8 }}>Username</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} style={{ marginBottom: 20 }} required />

          <label style={{ fontWeight: 900, fontSize: 20, display: "block", marginBottom: 8 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginBottom: 24 }} required />

          {error && <p style={{ color: "#EF4444", fontWeight: 600, marginBottom: 16 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}