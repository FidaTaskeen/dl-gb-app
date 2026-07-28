import ExcelJS from "exceljs";

const HEADER_FILL = "FF1E1B2E";
const FIELD_FILL = "FFFFF3CD";
const FIELD_FONT = "FF92400E";

export async function downloadFailureLogExcel(logs, dateLabel) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Failure Log");

  sheet.columns = [
    { header: "S.No", key: "sno", width: 8 },
    { header: "Date", key: "date", width: 14 },
    { header: "Time", key: "time", width: 12 },
    { header: "Protocol", key: "protocol", width: 12 },
    { header: "RSN", key: "rsn", width: 20 },
    { header: "Field Name", key: "fieldName", width: 14 },
    { header: "DL Value", key: "dlValue", width: 26 },
    { header: "GB Value", key: "gbValue", width: 26 },
    { header: "Failure Reason", key: "failureReason", width: 22 },
    { header: "Duplicate Info", key: "duplicateInfo", width: 30 },
    { header: "Scanned By", key: "scannedBy", width: 16 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  logs.forEach((log, i) => {
    const created = new Date(log.createdAt);
    const scannedBy =
      (log.createdBy && typeof log.createdBy === "object" ? log.createdBy.username : log.createdByUsername) ||
      "Unknown";
    const hasDup = log.duplicateStatus && log.duplicateStatus !== "Unique";

    const row = sheet.addRow({
      sno: i + 1,
      date: created.toLocaleDateString(),
      time: created.toLocaleTimeString(),
      protocol: log.protocol,
      rsn: log.rsn || "-",
      fieldName: log.fieldName,
      dlValue: log.dlValue || "-",
      gbValue: log.gbValue || "-",
      failureReason: log.failureReason || "-",
      duplicateInfo: hasDup ? log.duplicateDetails || log.duplicateStatus : "-",
      scannedBy,
    });

    row.eachCell((cell, colNumber) => {
      const col = sheet.columns[colNumber - 1];
      if (col.key === "fieldName") {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FIELD_FILL } };
        cell.font = { color: { argb: FIELD_FONT }, bold: true };
      }
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD9D9D9" } },
        left: { style: "thin", color: { argb: "FFD9D9D9" } },
        bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
        right: { style: "thin", color: { argb: "FFD9D9D9" } },
      };
    });
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Failure_Log_${dateLabel || "all"}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}