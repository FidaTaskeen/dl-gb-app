import ExcelJS from "exceljs";

export async function downloadFailureLogExcel(logs) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Failure Log");

  sheet.columns = [
    { header: "S.No", key: "sno", width: 8 },
    { header: "Date", key: "date", width: 14 },
    { header: "Time", key: "time", width: 14 },
    { header: "Protocol", key: "protocol", width: 12 },
    { header: "Failure Type", key: "failureType", width: 14 },
    { header: "Failure Reason", key: "failureReason", width: 20 },
    { header: "Field Name", key: "fieldName", width: 14 },
    { header: "Scanned Value", key: "scannedValue", width: 34 },
    { header: "Related RSN", key: "relatedRsn", width: 20 },
    { header: "Related IMEI", key: "relatedImei", width: 20 },
    { header: "Related ICCID", key: "relatedIccid", width: 24 },
    { header: "Logged By", key: "loggedBy", width: 16 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E1B2E" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  // Same grouping logic as the on-screen table — one S.No per unique
  // scanAttemptId, not per row.
  const scanNumberMap = new Map();
  let nextScanNumber = logs.length;
  logs.forEach((l) => {
    if (!scanNumberMap.has(l.scanAttemptId)) {
      scanNumberMap.set(l.scanAttemptId, nextScanNumber);
      nextScanNumber -= 1;
    }
  });

  logs.forEach((l) => {
    const dt = new Date(l.createdAt);
    const loggedBy = (l.createdBy && typeof l.createdBy === "object" ? l.createdBy.username : "") || "Unknown";

    const row = sheet.addRow({
      sno: scanNumberMap.get(l.scanAttemptId),
      date: dt.toLocaleDateString(),
      time: dt.toLocaleTimeString(),
      protocol: l.protocol,
      failureType: l.failureType,
      failureReason: l.failureReason,
      fieldName: l.fieldName,
      scannedValue: l.scannedValue,
      relatedRsn: l.relatedRsn || "-",
      relatedImei: l.relatedImei || "-",
      relatedIccid: l.relatedIccid || "-",
      loggedBy,
    });

    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };
      if (l.failureType === "DUPLICATE") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEFCE8" } };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF2F2" } };
      }
    });
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `failure_log_${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}