import ExcelJS from "exceljs";

const DL_FILL = "FFEFF6FF";
const GB_FILL = "FFFFF7ED";
const DL_HEADER_FILL = "FFDBEAFE";
const GB_HEADER_FILL = "FFFFEDD5";
const HEADER_FILL = "FF1E1B2E";
const MISMATCH_FILL = "FFFFC7CE";
const MISMATCH_FONT = "FF9C0006";
const FAIL_FONT = "FFDC2626";
const PASS_FONT = "FF16A34A";

const FIELD_KEY_MAP = { RSN: "srno", IMEI: "imei", EAN: "ean", ICCID: "iccid", "MAC ID": "macId" };
const MISMATCH_ALIAS = { RSN: "RSN", IMEI: "IMEI", EAN: "EAN", "MAC ID": "MACID" };

export async function downloadExcelReport(records, protocolType, dateLabel) {
  const includeMacId = protocolType !== "Modbus";
  const fields = includeMacId ? ["RSN", "IMEI", "EAN", "ICCID", "MAC ID"] : ["RSN", "IMEI", "EAN", "ICCID"];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(`${protocolType} Report`);

  const columns = [
    { header: "S.No", key: "sno", width: 8 },
    ...fields.map((f) => ({ header: `DL ${f}`, key: `dl_${f}`, width: 22 })),
    { header: "", key: "spacer", width: 4 }, // blank spacer column between DL and GB
    ...fields.map((f) => ({ header: `GB ${f}`, key: `gb_${f}`, width: 22 })),
    { header: "Status", key: "status", width: 12 },
    { header: "Failure Reason", key: "reason", width: 20 },
    { header: "Date & Time", key: "datetime", width: 22 },
    { header: "Scanned By", key: "scannedBy", width: 16 },
  ];
  sheet.columns = columns;

  sheet.getRow(1).eachCell((cell, colNumber) => {
    const col = columns[colNumber - 1];
    const isDl = col.key.startsWith("dl_");
    const isGb = col.key.startsWith("gb_");

    if (col.key === "spacer") {
      // No fill, no border, no text — pure visual gap.
      return;
    }

    if (isDl) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DL_HEADER_FILL } };
      cell.font = { bold: true, color: { argb: "FF1E2328" } };
    } else if (isGb) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GB_HEADER_FILL } };
      cell.font = { bold: true, color: { argb: "FF1E2328" } };
    } else {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    }
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  records.forEach((r, i) => {
    const mismatchSet =
      r.status === "PASS" || !r.mismatchParams
        ? new Set()
        : new Set(r.mismatchParams.split(",").map((s) => s.trim().toUpperCase()));

    const scannedBy =
      (r.createdBy && typeof r.createdBy === "object" ? r.createdBy.username : r.createdByUsername) || "Unknown";

    const rowData = { sno: i + 1 };
    fields.forEach((f) => { rowData[`dl_${f}`] = String(r.dl?.[FIELD_KEY_MAP[f]] || "-"); });
    rowData.spacer = ""; // always blank
    fields.forEach((f) => { rowData[`gb_${f}`] = String(r.gb?.[FIELD_KEY_MAP[f]] || "-"); });
    rowData.status = r.status;
    rowData.reason = r.status === "PASS" ? "-" : `${r.mismatchParams} mismatch`;
    rowData.datetime = new Date(r.createdAt).toLocaleString();
    rowData.scannedBy = scannedBy;

    const row = sheet.addRow(rowData);

    row.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1];

      if (col.key === "spacer") {
        // Leave completely blank — no fill, no border, no formatting.
        return;
      }

      const isDl = col.key.startsWith("dl_");
      const isGb = col.key.startsWith("gb_");

      if (isDl || isGb) {
        cell.numFmt = "@";
      }

      const fieldName = col.key.replace(/^dl_|^gb_/, "");
      const isMismatched = (isDl || isGb) && mismatchSet.has(MISMATCH_ALIAS[fieldName]);

      if (isMismatched) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: MISMATCH_FILL } };
        cell.font = { color: { argb: MISMATCH_FONT }, bold: true };
      } else if (isDl) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DL_FILL } };
      } else if (isGb) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GB_FILL } };
      } else if (col.key === "status") {
        cell.font = {
          bold: true,
          color: { argb: r.status === "PASS" ? PASS_FONT : FAIL_FONT },
        };
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
  link.download = `${protocolType}_report_${dateLabel || "all"}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}