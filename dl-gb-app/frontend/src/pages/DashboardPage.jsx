import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProtocol } from "../context/ProtocolContext";

const MODE_FIELDS = {
  Modbus: ["RSN", "IMEI", "EAN", "ICCID"],
  Zigbee: ["RSN", "IMEI", "EAN", "ICCID", "MAC ID"],
};

export default function DashboardPage() {
  const { username, logout } = useAuth();
  const { protocol, setProtocol } = useProtocol();
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) logout();
  };
  const modeBtn = (label) => (
    <button
      key={label}
      onClick={() => setProtocol(label)}
      className={protocol === label ? "" : "btn-ghost"}
      style={{ fontSize: 18, padding: "14px 28px", flex: 1 }}
    >
      {label}
    </button>
  );
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
        <h2 style={{ fontSize: 54, color: "black", margin: 0 }}>Dashboard</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ color: "white", fontWeight: 700 }}>{username}</span>
          <button className="btn-ghost" style={{ background: "white" }} onClick={handleLogout}>Logout</button>
        </div>
      </div>
      <div className="panel panel-accent" style={{ marginBottom: 24 }}>
        <p style={{ color: "#F59E0B", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em", margin: "0 0 12px" }}>
          COMMUNICATION MODE
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          {modeBtn("Modbus")}
          {modeBtn("Zigbee")}
        </div>
        <p style={{ color: "#6B6483", marginTop: 14, fontSize: 16 }}>
          Currently selected: <b>{protocol}</b>. This mode applies to the Check page and Reports until you change it.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {MODE_FIELDS[protocol].map((field) => (
            <span
              key={field}
              style={{
                background: "#F3F0FF",
                color: "#6B46C1",
                fontSize: 13,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 999,
              }}
            >
              {field}
            </span>
          ))}
        </div>
      </div>
      <Link to="/check" className="panel panel-accent" style={{ display: "block", marginBottom: 24, textDecoration: "none" }}>
        <p style={{ color: "#F59E0B", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em", margin: "0 0 8px" }}>STEP 01</p>
        <h3 style={{ fontSize: 26, margin: 0 }}>New Check</h3>
        <p style={{ color: "#6B6483", marginTop: 8, fontSize: 15 }}>Scan DL and GB labels to verify a match ({protocol})</p>
      </Link>
      <Link to="/reports" className="panel panel-accent" style={{ display: "block", textDecoration: "none" }}>
        <p style={{ color: "#F59E0B", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em", margin: "0 0 8px" }}>STEP 02</p>
        <h3 style={{ fontSize: 26, margin: 0 }}>Reports</h3>
        <p style={{ color: "#6B6483", marginTop: 8, fontSize: 15 }}>View and download the {protocol} report</p>
      </Link>
    </div>
  );
}