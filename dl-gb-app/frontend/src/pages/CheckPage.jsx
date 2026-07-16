import { useEffect, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useProtocol } from "../context/ProtocolContext";
import { Link } from "react-router-dom";
import LabelScanner from "../components/ScannerInput";
import { parseLabelXml } from "../utils/xmlParser";

export default function CheckPage() {
  const { username, logout } = useAuth();
  const { protocol } = useProtocol();
  const [dl, setDl] = useState(null);
  const [gb, setGb] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const dlRef = useRef(null);
  const gbRef = useRef(null);
  const dlDataRef = useRef(null);
  const gbDataRef = useRef(null);
  const loadingRef = useRef(false);
  const autoClearTimerRef = useRef(null);
  const autoSubmittedRef = useRef(false);

  useEffect(() => { dlRef.current?.focus(); }, []);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    if (!result) return;
    autoClearTimerRef.current = setTimeout(() => {
      dlRef.current?.clear();
      gbRef.current?.clear();
      setDl(null);
      setGb(null);
      dlDataRef.current = null;
      gbDataRef.current = null;
      setResult(null);
      autoSubmittedRef.current = false;
      dlRef.current?.focus();
    }, 10000);

    return () => clearTimeout(autoClearTimerRef.current);
  }, [result]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) logout();
  };

  const handleDlScan = (rawText) => {
    if (!rawText) { setDl(null); dlDataRef.current = null; return; }
    const parsed = { raw: rawText, ...parseLabelXml(rawText) };
    setDl(parsed);
    dlDataRef.current = parsed;
  };

  const handleGbScan = (rawText) => {
    if (!rawText) { setGb(null); gbDataRef.current = null; return; }
    const parsed = { raw: rawText, ...parseLabelXml(rawText) };
    setGb(parsed);
    gbDataRef.current = parsed;
  };

  const matchesSelectedProtocol = (modelNo) => {
    const model = modelNo || "";
    if (protocol === "Zigbee") return /zigbee/i.test(model);
    if (protocol === "Modbus") return /modbus/i.test(model);
    return true;
  };

  const validateDl = (xmlText) => {
    const parsed = parseLabelXml(xmlText);
    if (parsed.price) {
      return { valid: false, message: "Invalid Label. Please scan only DL label." };
    }
    if (!matchesSelectedProtocol(parsed.modelNo)) {
      return { valid: false, message: `Invalid Label. This label does not belong to ${protocol} mode.` };
    }
    return { valid: true };
  };

  const validateGb = (xmlText) => {
    const parsed = parseLabelXml(xmlText);
    if (!parsed.price) {
      return { valid: false, message: "Invalid Label. Please scan only GB label." };
    }
    if (!matchesSelectedProtocol(parsed.modelNo)) {
      return { valid: false, message: `Invalid Label. This label does not belong to ${protocol} mode.` };
    }
    return { valid: true };
  };

  const submitCheck = async () => {
    const dlData = dlDataRef.current;
    const gbData = gbDataRef.current;
    if (!dlData || !gbData || loadingRef.current) {
      if (!dlData || !gbData) setError("Please scan both DL and GB labels first.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await client.post("/records", { dl: dlData, gb: gbData, protocol });
      setResult(res.data);
    } catch (err) {
      setError("Failed to submit.");
    } finally {
      setLoading(false);
    }
  };

  const handleDlComplete = () => {
    gbRef.current?.focus();
  };

  // Manual fallback: still allow submitting with Enter.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Enter" && dl && gb && !loadingRef.current) {
        e.preventDefault();
        submitCheck();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dl, gb]);

  // Auto-submit: the moment both DL and GB have been scanned, submit
  // automatically without waiting for Enter or a button click.
  // autoSubmittedRef guards against firing twice for the same pair.
  useEffect(() => {
    if (dl && gb && !loadingRef.current && !autoSubmittedRef.current) {
      autoSubmittedRef.current = true;
      submitCheck();
    }
  }, [dl, gb]);

  return (
    <div className="page-check">
      <div className="page-container">
        <div className="page-header">
          <div>
            <h2 className="page-title">DL vs GB Check</h2>
            <div className="nav-box-row">
              <Link to="/dashboard" className="nav-box nav-box-solid">Dashboard</Link>
              <Link to="/reports" className="nav-box nav-box-outline">{protocol} Report</Link>
            </div>
          </div>
          <div className="header-right">
            <span className="username-tag">Mode: {protocol}</span>
            <span className="username-tag">{username}</span>
            <button className="btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, alignItems: "stretch" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="panel panel-accent scan-box">
              <h3 className="scan-box-title">DL — Device Label</h3>
              <LabelScanner
                ref={dlRef}
                label="DL"
                onScan={handleDlScan}
                onComplete={handleDlComplete}
                validate={validateDl}
              />
            </div>

            <div className="panel panel-accent scan-box">
              <h3 className="scan-box-title">GB — Gift Box</h3>
              <LabelScanner
                ref={gbRef}
                label="GB"
                onScan={handleGbScan}
                validate={validateGb}
              />
            </div>
          </div>

          {result && (
            <div className="panel result-panel" style={{ flexShrink: 0, width: 260, alignSelf: "stretch" }}>
              <span
                className={`status-light ${result.status === "PASS" ? "status-pass" : "status-fail"}`}
                style={{ width: 18, height: 18 }}
              />
              <span className={`result-status ${result.status === "PASS" ? "status-pass" : "status-fail"}`}>
                {result.status}
              </span>
              {result.status === "FAIL" && (
                <p className="result-mismatch">Mismatch: {result.mismatchParams}</p>
              )}
              <p style={{ fontSize: 12, color: "#8A93A0", marginTop: 10 }}>
                Clearing automatically in 10 seconds...
              </p>
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button
          onClick={submitCheck}
          disabled={loading || !dl || !gb}
          className="submit-btn"
        >
          {loading ? "Checking..." : "Submit Check"}
        </button>
      </div>
    </div>
  );
}