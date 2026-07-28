import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { downloadFailureLogExcel } from "../utils/failureLogExport";

const FIELD_OPTIONS = ["RSN", "IMEI", "EAN", "ICCID", "MACID"];

export default function FailureLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const [protocolFilter, setProtocolFilter] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    const params = {};
    if (protocolFilter) params.protocol = protocolFilter;
    if (fieldFilter) params.fieldName = fieldFilter;
    if (search.trim()) params.search = search.trim();
    if (date) {
      params.from = `${date}T00:00:00`;
      params.to = `${date}T23:59:59`;
    }
    client.get("/failure-logs", { params }).then((res) => {
      setLogs(res.data.logs);
      setLoading(false);
    });
  };

  // Refetch whenever a filter changes. Search is debounced slightly so we
  // aren't firing a request on every keystroke.
  useEffect(fetchLogs, [protocolFilter, fieldFilter, date]);
  useEffect(() => {
    const t = setTimeout(fetchLogs, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleClear = async () => {
    const confirmed = window.confirm(
      "This will permanently delete ALL entries in the Failure Log. Your main Reports and Duplicate Report data will NOT be affected. Continue?"
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      await client.delete("/failure-logs");
      await fetchLogs();
    } catch (err) {
      alert("Failed to clear the failure log. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  const handleDownload = () => {
    downloadFailureLogExcel(logs, date);
  };

  const getScannedBy = (log) => {
    if (log.createdBy && typeof log.createdBy === "object") {
      return log.createdBy.username || "Unknown";
    }
    return log.createdByUsername || "Unknown";
  };

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "50px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 35, color: "black", margin: 0 }}>Failure Log Report</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/dashboard" style={{ color: "black" }}>Dashboard</Link>
          <Link to="/check" style={{ color: "black" }}>Check</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search RSN / value..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
        <select value={protocolFilter} onChange={(e) => setProtocolFilter(e.target.value)} style={{ width: "auto" }}>
          <option value="">All Protocols</option>
          <option value="Modbus">Modbus</option>
          <option value="Zigbee">Zigbee</option>
        </select>
        <select value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)} style={{ width: "auto" }}>
          <option value="">All Fields</option>
          {FIELD_OPTIONS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
        <button onClick={handleDownload} disabled={logs.length === 0}>Download Excel</button>
        <button
          onClick={handleClear}
          disabled={clearing || loading || logs.length === 0}
          style={{ background: "#DC2626", color: "white", border: "none" }}
        >
          {clearing ? "Clearing..." : "Clear Failure Log"}
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#7C8A93", marginTop: 20 }}>Loading...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: "#7C8A93", marginTop: 20 }}>No failure log entries found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ marginTop: 20, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Time</th>
                <th>Protocol</th>
                <th>RSN</th>
                <th>Field Name</th>
                <th>DL Value</th>
                <th>GB Value</th>
                <th>Failure Reason</th>
                <th>Duplicate Info</th>
                <th>Scanned By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const created = new Date(log.createdAt);
                const hasDup = log.duplicateStatus && log.duplicateStatus !== "Unique";
                return (
                  <tr key={log._id}>
                    <td>{i + 1}</td>
                    <td>{created.toLocaleDateString()}</td>
                    <td>{created.toLocaleTimeString()}</td>
                    <td>{log.protocol}</td>
                    <td>{log.rsn || "-"}</td>
                    <td>
                      <span className="dup-status-badge dup-status-flagged">{log.fieldName}</span>
                    </td>
                    <td>{log.dlValue || "-"}</td>
                    <td>{log.gbValue || "-"}</td>
                    <td>{log.failureReason || "-"}</td>
                    <td style={{ fontSize: 13 }}>
                      {hasDup ? (log.duplicateDetails || log.duplicateStatus) : "-"}
                    </td>
                    <td>{getScannedBy(log)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}