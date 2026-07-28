import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { downloadFailureLogExcel } from "../utils/failureLogExcel";

export default function FailureLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [failureType, setFailureType] = useState("");
  const [fieldName, setFieldName] = useState("");
  const [date, setDate] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (failureType) params.failureType = failureType;
    if (fieldName) params.fieldName = fieldName;
    if (date) {
      params.from = `${date}T00:00:00`;
      params.to = `${date}T23:59:59`;
    }
    client.get("/failure-log", { params }).then((res) => {
      setLogs(res.data.logs);
      setLoading(false);
    });
  };

  useEffect(fetchLogs, [search, failureType, fieldName, date]);

  const handleClear = async () => {
    if (!window.confirm("This will permanently delete ALL failure log entries. Continue?")) return;
    await client.delete("/failure-log/clear-all");
    fetchLogs();
  };

  const handleExport = () => {
    downloadFailureLogExcel(logs);
  };

  const getLoggedBy = (l) => {
    if (l.createdBy && typeof l.createdBy === "object") return l.createdBy.username || "Unknown";
    return "Unknown";
  };

  // Assign a serial number per unique scanAttemptId, and precompute
  // how many rows belong to each group (for rowSpan) plus which row
  // is the first of its group (only the first renders the S.No/Date/
  // Time/Protocol/Related-record cells, spanning down over the rest).
  const scanNumberMap = new Map();
  const groupSizeMap = new Map();
  let nextScanNumber = 0;
  logs.forEach((l) => {
    groupSizeMap.set(l.scanAttemptId, (groupSizeMap.get(l.scanAttemptId) || 0) + 1);
  });
  const seenGroups = new Set();
  logs.forEach((l) => {
    if (!seenGroups.has(l.scanAttemptId)) {
      seenGroups.add(l.scanAttemptId);
    }
  });
  const totalGroups = seenGroups.size;
  nextScanNumber = totalGroups;
  const assigned = new Set();
  logs.forEach((l) => {
    if (!assigned.has(l.scanAttemptId)) {
      scanNumberMap.set(l.scanAttemptId, nextScanNumber);
      assigned.add(l.scanAttemptId);
      nextScanNumber -= 1;
    }
  });

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "50px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 35, color: "black", margin: 0 }}>Failure Log Report</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/dashboard" style={{ color: "black" }}>Dashboard</Link>
          <Link to="/reports" style={{ color: "black" }}>Reports</Link>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 20 }}>
        <input
          type="text"
          placeholder="Search value, RSN, IMEI, ICCID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: 240 }}
        />
        <select value={failureType} onChange={(e) => setFailureType(e.target.value)}>
          <option value="">All types</option>
          <option value="MISMATCH">Mismatch</option>
          <option value="DUPLICATE">Duplicate</option>
        </select>
        <select value={fieldName} onChange={(e) => setFieldName(e.target.value)}>
          <option value="">All fields</option>
          <option value="RSN">RSN</option>
          <option value="IMEI">IMEI</option>
          <option value="EAN">EAN</option>
          <option value="ICCID">ICCID</option>
          <option value="MACID">MACID</option>
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button onClick={handleExport}>Export Excel</button>
        <button onClick={handleClear} style={{ color: "#DC2626" }}>Clear All</button>
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
                <th>Failure Type</th>
                <th>Failure Reason</th>
                <th>Field Name</th>
                <th>Scanned Value</th>
                <th>Related Record (RSN / IMEI / ICCID)</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, idx) => {
                const dt = new Date(l.createdAt);
                const scanNo = scanNumberMap.get(l.scanAttemptId);
                const isFirstOfGroup = idx === 0 || logs[idx - 1].scanAttemptId !== l.scanAttemptId;
                const groupSize = groupSizeMap.get(l.scanAttemptId);
                return (
                  <tr
                    key={l._id}
                    style={{
                      background: l.failureType === "DUPLICATE" ? "#FEFCE8" : "#FEF2F2",
                      borderTop: isFirstOfGroup ? "2px solid #D1D5DB" : "none",
                    }}
                  >
                    {isFirstOfGroup && (
                      <>
                        <td rowSpan={groupSize} style={{ fontWeight: 700, color: "#4B5563", verticalAlign: "top", background: "#F3F4F6" }}>
                          {scanNo}
                        </td>
                        <td rowSpan={groupSize} style={{ verticalAlign: "top" }}>{dt.toLocaleDateString()}</td>
                        <td rowSpan={groupSize} style={{ verticalAlign: "top" }}>{dt.toLocaleTimeString()}</td>
                        <td rowSpan={groupSize} style={{ verticalAlign: "top" }}>{l.protocol}</td>
                      </>
                    )}
                    <td>{l.failureType}</td>
                    <td>{l.failureReason}</td>
                    <td>{l.fieldName}</td>
                    <td>{l.scannedValue}</td>
                    {isFirstOfGroup && (
                      <td rowSpan={groupSize} style={{ verticalAlign: "top" }}>
                        {l.failureType === "DUPLICATE"
                          ? `RSN: ${l.relatedRsn || "-"}, IMEI: ${l.relatedImei || "-"}, ICCID: ${l.relatedIccid || "-"}`
                          : "-"}
                      </td>
                    )}
                    {isFirstOfGroup && (
                      <td rowSpan={groupSize} style={{ verticalAlign: "top" }}>{getLoggedBy(l)}</td>
                    )}
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