import { useEffect, useRef, useState } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useProtocol } from "../context/ProtocolContext";
import { Link } from "react-router-dom";
import LabelScanner from "../components/ScannerInput";
import { parseLabelXml } from "../utils/xmlParser";
import deviceImage from "../assets/device-image.png";
import deviceBoxImage from "../assets/device-box-image.png";

const AUTO_CLEAR_DELAY_MS = 10000;

export default function CheckPage() {
  const { username, logout } = useAuth();
  const { protocol } = useProtocol();
  const [dl, setDl] = useState(null);
  const [gb, setGb] = useState(null);
  const [result, setResult] = useState(null);
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const dlRef = useRef(null);
  const gbRef = useRef(null);
  const dlDataRef = useRef(null);
  const gbDataRef = useRef(null);
  const loadingRef = useRef(false);
  const autoClearTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const autoSubmittedRef = useRef(false);

  useEffect(() => { dlRef.current?.focus(); }, []);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  useEffect(() => {
    clearTimeout(autoClearTimerRef.current);
    clearInterval(countdownIntervalRef.current);

    if (!result && !duplicateResult) {
      setCountdown(null);
      return;
    }

    let secondsLeft = AUTO_CLEAR_DELAY_MS / 1000;
    setCountdown(secondsLeft);

    countdownIntervalRef.current = setInterval(() => {
      secondsLeft -= 1;
      setCountdown(secondsLeft > 0 ? secondsLeft : 0);
      if (secondsLeft <= 0) clearInterval(countdownIntervalRef.current);
    }, 1000);

    autoClearTimerRef.current = setTimeout(() => {
      dlRef.current?.clear();
      gbRef.current?.clear();
      setDl(null);
      setGb(null);
      dlDataRef.current = null;
      gbDataRef.current = null;
      setResult(null);
      setDuplicateResult(null);
      setCountdown(null);
      autoSubmittedRef.current = false;
      dlRef.current?.focus();
    }, AUTO_CLEAR_DELAY_MS);

    return () => {
      clearTimeout(autoClearTimerRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, [result, duplicateResult]);

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
    setDuplicateResult(null);
    setLoading(true);
    try {
      const res = await client.post("/records", { dl: dlData, gb: gbData, protocol });
      setResult(res.data);
    } catch (err) {
      if (err.response?.status === 409) {
        // Duplicate rejected by the server — nothing was saved.
        setDuplicateResult(err.response.data.duplicateInfo || []);
      } else {
        setError("Failed to submit.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDlComplete = () => {
    gbRef.current?.focus();
  };

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
              <span className="model-badge">
                <span className="model-badge-label">Model</span>
                <span className="model-badge-value">{protocol}</span>
              </span>
            </div>
          </div>
          <div className="header-right">
            <span className="username-tag">{username}</span>
            <button className="btn-ghost" onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* DL and GB side by side, equal width/height, each with a static device image */}
        <div className="check-scan-row">
          <div className="panel panel-accent scan-box-equal scan-box-with-image">
            <div className="scan-box-image-wrap">
              <img src={deviceImage} alt="IoT Gateway device" className="scan-box-image" />
            </div>
            <div className="scan-box-content">
              <h3 className="scan-box-title">DL — Device Label</h3>
              <LabelScanner
                ref={dlRef}
                label="DL"
                onScan={handleDlScan}
                onComplete={handleDlComplete}
                validate={validateDl}
              />
            </div>
          </div>

          <div className="panel panel-accent scan-box-equal scan-box-with-image">
            <div className="scan-box-image-wrap">
              <img src={deviceBoxImage} alt="IoT Gateway retail box" className="scan-box-image" />
            </div>
            <div className="scan-box-content">
              <h3 className="scan-box-title">GB — Gift Box</h3>
              <LabelScanner
                ref={gbRef}
                label="GB"
                onScan={handleGbScan}
                validate={validateGb}
              />
            </div>
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        {!result && !duplicateResult && (
          <button
            onClick={submitCheck}
            disabled={loading || !dl || !gb}
            className="submit-btn"
          >
            {loading ? "Checking..." : "Submit Check"}
          </button>
        )}

        <div className="check-result-row">
          <div className="panel result-panel result-panel-centered">
            <h3 className="result-title">Status</h3>
            {duplicateResult ? (
              <>
                <span
                  className="status-light"
                  style={{ width: 18, height: 18, background: "#F59E0B" }}
                />
                <span className="result-status" style={{ color: "#F59E0B" }}>
                  DUPLICATE
                </span>
                {duplicateResult.map((d, idx) => (
                  <p key={idx} className="result-mismatch">
                    {d.field} {d.value} already used — RSN {d.matchedRsn || "-"}, IMEI {d.matchedImei || "-"}, ICCID {d.matchedIccid || "-"}
                  </p>
                ))}
                {countdown !== null && countdown > 0 && (
                  <p className="auto-clear-countdown">
                    Clearing in {countdown} second{countdown === 1 ? "" : "s"}...
                  </p>
                )}
              </>
            ) : result ? (
              <>
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
                {countdown !== null && countdown > 0 && (
                  <p className="auto-clear-countdown">
                    Clearing in {countdown} second{countdown === 1 ? "" : "s"}...
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="result-status result-pending">—</span>
                <p className="result-mismatch">Awaiting check</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}