import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";

const extractXmlPayload = (text) => {
  const idx = text.indexOf("<?xml");
  if (idx === -1) return "";
  return text.slice(idx).trim();
};

const cutOffSecondScan = (text) => {
  const first = text.indexOf("<?xml");
  if (first === -1) return null;
  const second = text.indexOf("<?xml", first + 5);
  if (second === -1) return null;
  return text.slice(first, second).trim();
};

// Counts how many "<?xml" payload markers are present, used to detect
// whether a fresh scan has been appended to an already-scanned box.
const countXmlMarkers = (text) => (text.match(/<\?xml/g) || []).length;

const LabelScanner = forwardRef(({ label, onScan, onComplete, validate }, ref) => {
  const [buffer, setBuffer] = useState("");
  const [hasScanned, setHasScanned] = useState(false);
  const [warning, setWarning] = useState("");
  const textareaRef = useRef(null);
  const idleTimerRef = useRef(null);

  const handleClear = () => {
    clearTimeout(idleTimerRef.current);
    setBuffer("");
    setHasScanned(false);
    setWarning("");
    onScan("");
  };

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    clear: () => handleClear(),
  }));

  useEffect(() => () => clearTimeout(idleTimerRef.current), []);

  const finalizeScan = (rawValue) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return;
    const xmlOnly = extractXmlPayload(trimmed);

    if (!xmlOnly) {
      setWarning("That doesn't look like the XML label. Please scan the QR code.");
      setBuffer("");
      onScan("");
      setHasScanned(false);
      return;
    }

    if (validate) {
      const result = validate(xmlOnly);
      if (!result.valid) {
        setWarning(result.message || "Invalid label.");
        setBuffer("");
        onScan("");
        setHasScanned(false);
        return;
      }
    }

    setWarning("");
    setBuffer(xmlOnly);
    onScan(xmlOnly);
    setHasScanned(true);
    onComplete?.(xmlOnly);
  };

  const scheduleCompletion = (value) => {
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => finalizeScan(value), 250);
  };

  const handleChange = (e) => {
    const value = e.target.value;

    if (hasScanned) {
      // A hardware scanner "types" into the focused box, so a second
      // scan arrives here (not via paste). If the incoming text has
      // more "<?xml" markers than what's already stored, a fresh scan
      // was just fired into an already-filled box — reject it and
      // keep the original value untouched.
      const incomingCount = countXmlMarkers(value);
      const storedCount = countXmlMarkers(buffer);
      if (incomingCount > storedCount) {
        setWarning(`${label} already scanned. Click "Clear" to scan a new label.`);
        return;
      }

      setBuffer(value);
      setWarning("");
      onScan(value.trim());
      return;
    }

    const firstScanOnly = cutOffSecondScan(value);
    if (firstScanOnly !== null) {
      clearTimeout(idleTimerRef.current);
      setBuffer(firstScanOnly);
      finalizeScan(firstScanOnly);
      return;
    }

    setBuffer(value);
    setWarning("");
    scheduleCompletion(value);
  };

  const handleKeyDown = (e) => {
    if (hasScanned) return;
    if (e.key === "Enter") {
      e.preventDefault();
      scheduleCompletion(buffer);
    }
  };

  const handlePaste = (e) => {
    if (hasScanned) return;
    const pastedText = e.clipboardData.getData("text");
    if (!pastedText.trim()) return;
    e.preventDefault();
    clearTimeout(idleTimerRef.current);

    const firstScanOnly = cutOffSecondScan(pastedText);
    if (firstScanOnly !== null) {
      setBuffer(firstScanOnly);
      finalizeScan(firstScanOnly);
      return;
    }

    setBuffer(pastedText);
    finalizeScan(pastedText);
  };

  const handleClearClick = () => {
    handleClear();
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <label style={{ fontWeight: 700, fontSize: 15 }}>Scan or Paste {label} Label</label>
        {hasScanned && (
          <button type="button" className="btn-ghost" onClick={handleClearClick} style={{ fontSize: 13, padding: "8px 14px" }}>
            Clear
          </button>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={buffer}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={`Scan the ${label} QR code here`}
        autoComplete="off"
        rows={hasScanned ? 5 : 3}
        className="scan-textarea"
      />
      {hasScanned && (
        <p style={{ fontSize: 12, color: "#8A93A0", marginTop: 6 }}>
          Scanned. Click inside to edit, or "Clear" to scan a new label.
        </p>
      )}
      {warning && <p style={{ color: "#DC2626", fontSize: 13, marginTop: 8, fontWeight: 600 }}>{warning}</p>}
    </div>
  );
});

export default LabelScanner;