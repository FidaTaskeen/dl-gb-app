import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { useProtocol } from "../context/ProtocolContext";

const DL_BG = "#EFF6FF";
const GB_BG = "#FFF7ED";
const DL_HEADER_BG = "#DBEAFE";
const GB_HEADER_BG = "#FFEDD5";
const MISMATCH_BG = "#FEF2F2";

export default function DuplicateReportPage() {
  const { protocol } = useProtocol();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = () => {
    setLoading(true);
    client.get("/records", { params: { limit: 2000 } }).then((res) => {
      setRecords(res.data.records);
      setLoading(false);
    });
  };

  useEffect(fetchRecords, []);

  const getScannedBy = (r) => {
    if (r.createdBy && typeof r.createdBy === "object") {
      return { name: r.createdBy.username || r.createdBy.name || "Unknown", detail: r.createdBy.email || r.createdBy._id || "" };
    }
    return { name: r.createdByUsername || "Unknown", detail: "" };
  };

  const getProtocol = (r) => {
    if (r.protocol === "Zigbee" || r.protocol === "Modbus") return r.protocol;
    const model = r.dl?.modelNo || r.gb?.modelNo || "";
    if (/zigbee/i.test(model)) return "Zigbee";
    if (/modbus/i.test(model)) return "Modbus";
    return "Other";
  };

  const getMismatchSet = (r) => {
    const mismatches = new Set();
    if ((r.dl?.srno || "") !== (r.gb?.srno || "")) mismatches.add("RSN");
    if ((r.dl?.imei || "") !== (r.gb?.imei || "")) mismatches.add("IMEI");
    if ((r.dl?.ean || "") !== (r.gb?.ean || "")) mismatches.add("EAN");
    if ((r.dl?.iccid || "") !== (r.gb?.iccid || "")) mismatches.add("ICCID");
    if (getProtocol(r) === "Zigbee" && (r.dl?.macId || "") !== (r.gb?.macId || "")) mismatches.add("MACID");
    return mismatches;
  };

  // Only duplicates, filtered to the currently selected protocol —
  // this is what makes the report separate per Modbus/Zigbee.
  const duplicateRecords = records.filter((r) => r.isDuplicate && getProtocol(r) === protocol);
  const showMacId = protocol === "Zigbee";

  const cellStyle = (isMismatch, groupBg) => ({
    color: isMismatch ? "#DC2626" : undefined,
    fontWeight: isMismatch ? 700 : undefined,
    background: isMismatch ? MISMATCH_BG : groupBg,
  });

  return (
    <div style={{ maxWidth: 1300, margin: "0 auto", padding: "50px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ fontSize: 35, color: "black", margin: 0 }}>{protocol} Duplicate Report</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/dashboard" style={{ color: "black" }}>Dashboard</Link>
          <Link to="/reports" style={{ color: "black" }}>{protocol} Report</Link>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#7C8A93" }}>Loading...</p>
      ) : duplicateRecords.length === 0 ? (
        <p style={{ color: "#7C8A93", marginTop: 20 }}>No duplicates found for {protocol}.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ marginTop: 20, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th rowSpan={2}>S.No</th>
                <th
                  colSpan={showMacId ? 5 : 4}
                  style={{ textAlign: "center", background: DL_HEADER_BG, borderLeft: "3px solid #93C5FD" }}
                >
                  DL
                </th>
                <th
                  colSpan={showMacId ? 5 : 4}
                  style={{ textAlign: "center", background: GB_HEADER_BG, borderLeft: "3px solid #FDBA74" }}
                >
                  GB
                </th>
                <th rowSpan={2}>Status</th>
                <th rowSpan={2}>Duplicate Fields</th>
                <th rowSpan={2}>Matched With (RSN)</th>
                <th rowSpan={2}>Date & Time</th>
                <th rowSpan={2}>Scanned By</th>
              </tr>
              <tr>
                <th style={{ background: DL_HEADER_BG, borderLeft: "3px solid #93C5FD" }}>RSN</th>
                <th style={{ background: DL_HEADER_BG }}>IMEI</th>
                <th style={{ background: DL_HEADER_BG }}>EAN</th>
                <th style={{ background: DL_HEADER_BG }}>ICCID</th>
                {showMacId && <th style={{ background: DL_HEADER_BG }}>MAC ID</th>}
                <th style={{ background: GB_HEADER_BG, borderLeft: "3px solid #FDBA74" }}>RSN</th>
                <th style={{ background: GB_HEADER_BG }}>IMEI</th>
                <th style={{ background: GB_HEADER_BG }}>EAN</th>
                <th style={{ background: GB_HEADER_BG }}>ICCID</th>
                {showMacId && <th style={{ background: GB_HEADER_BG }}>MAC ID</th>}
              </tr>
            </thead>
            <tbody>
              {duplicateRecords.map((r, i) => {
                const mismatch = getMismatchSet(r);
                const scannedBy = getScannedBy(r);
                return (
                  <tr key={r._id} style={{ background: "#FEFCE8" }}>
                    <td>{i + 1}</td>
                    <td style={{ ...cellStyle(mismatch.has("RSN"), DL_BG), borderLeft: "3px solid #93C5FD" }}>{r.dl?.srno || "-"}</td>
                    <td style={cellStyle(mismatch.has("IMEI"), DL_BG)}>{r.dl?.imei || "-"}</td>
                    <td style={cellStyle(mismatch.has("EAN"), DL_BG)}>{r.dl?.ean || "-"}</td>
                    <td style={cellStyle(mismatch.has("ICCID"), DL_BG)}>{r.dl?.iccid || "-"}</td>
                    {showMacId && <td style={cellStyle(mismatch.has("MACID"), DL_BG)}>{r.dl?.macId || "-"}</td>}
                    <td style={{ ...cellStyle(mismatch.has("RSN"), GB_BG), borderLeft: "3px solid #FDBA74" }}>{r.gb?.srno || "-"}</td>
                    <td style={cellStyle(mismatch.has("IMEI"), GB_BG)}>{r.gb?.imei || "-"}</td>
                    <td style={cellStyle(mismatch.has("EAN"), GB_BG)}>{r.gb?.ean || "-"}</td>
                    <td style={cellStyle(mismatch.has("ICCID"), GB_BG)}>{r.gb?.iccid || "-"}</td>
                    {showMacId && <td style={cellStyle(mismatch.has("MACID"), GB_BG)}>{r.gb?.macId || "-"}</td>}
                    <td>
                      <span className={`status-light ${r.status === "PASS" ? "status-pass" : "status-fail"}`} />
                      <span className={r.status === "PASS" ? "status-pass" : "status-fail"}>{r.status}</span>
                    </td>
                    <td>
                      {(r.duplicateInfo || []).map((d, idx) => (
                        <div key={idx} style={{ fontSize: 12 }}>
                          {d.field}: {d.value}
                        </div>
                      ))}
                    </td>
                    <td>
                      {(r.duplicateInfo || []).map((d, idx) => (
                        <div key={idx} style={{ fontSize: 12 }}>
                          {d.matchedRsn || "-"}
                        </div>
                      ))}
                    </td>
                    <td>{new Date(r.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="user-popup-wrapper">
                        <span className="user-popup-badge">{scannedBy.name}</span>
                        {scannedBy.detail && <span className="user-popup-tooltip">{scannedBy.detail}</span>}
                      </span>
                    </td>
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