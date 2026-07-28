import Record from "../models/Record.js";

// Parameters checked individually for "already used elsewhere" warnings.
// Manufacturer and Communication Mode are intentionally NOT checked here:
// virtually every device on a given line shares the same manufacturer and
// protocol, so flagging those on every single scan would just be noise with
// no diagnostic value. RSN / IMEI / ICCID / MAC ID / Model are the fields
// that actually identify a specific physical device.
const PARAM_FIELDS = [
  { key: "srno", label: "RSN" },
  { key: "imei", label: "IMEI" },
  { key: "iccid", label: "ICCID" },
  { key: "modelNo", label: "Model" },
];

function matchedWithFrom(match) {
  return {
    rsn: match.dl?.srno || "-",
    imei: match.dl?.imei || "-",
    iccid: match.dl?.iccid || "-",
    macId: match.dl?.macId || "-",
    model: match.dl?.modelNo || "-",
  };
}

function describeMatch(paramLabel, matchedWith) {
  const parts = [];
  if (paramLabel !== "RSN") parts.push(`RSN: ${matchedWith.rsn}`);
  if (paramLabel !== "IMEI") parts.push(`IMEI: ${matchedWith.imei}`);
  if (paramLabel !== "ICCID") parts.push(`ICCID: ${matchedWith.iccid}`);
  if (paramLabel !== "MACID" && matchedWith.macId && matchedWith.macId !== "-") {
    parts.push(`MAC ID: ${matchedWith.macId}`);
  }
  return parts.join(", ");
}

export async function detectDuplicates({ dl, protocol }) {
  const fallback = {
    status: "Unique",
    details: "",
    duplicateCount: 1,
    previousScanAt: null,
    repeatedParams: [],
  };

  try {
    if (!dl) return fallback;

    const repeatedParams = [];

    for (const { key, label } of PARAM_FIELDS) {
      const value = dl[key];
      if (!value) continue;
      const match = await Record.findOne({ [`dl.${key}`]: value }).sort({ createdAt: -1 });
      if (match) {
        const matchedWith = matchedWithFrom(match);
        repeatedParams.push({
          param: label,
          value,
          matchedWith,
          description: describeMatch(label, matchedWith),
          matchedRecordId: match._id,
        });
      }
    }

    if (protocol === "Zigbee" && dl.macId) {
      const match = await Record.findOne({ "dl.macId": dl.macId, protocol: "Zigbee" }).sort({ createdAt: -1 });
      if (match) {
        const matchedWith = matchedWithFrom(match);
        repeatedParams.push({
          param: "MACID",
          value: dl.macId,
          matchedWith,
          description: describeMatch("MACID", matchedWith),
          matchedRecordId: match._id,
        });
      }
    }

    const exactMatchQuery = {
      "dl.srno": dl.srno || "__none__",
      "dl.imei": dl.imei || "__none__",
      "dl.iccid": dl.iccid || "__none__",
      protocol,
    };
    if (protocol === "Zigbee") exactMatchQuery["dl.macId"] = dl.macId || "__none__";

    const exactMatch = await Record.findOne(exactMatchQuery).sort({ createdAt: -1 });

    if (exactMatch) {
      return {
        status: "Duplicate Device",
        details: "Duplicate Device — identical RSN, IMEI, ICCID" + (protocol === "Zigbee" ? ", MAC ID" : "") + " as a prior scan",
        duplicateCount: (exactMatch.duplicateCount || 1) + 1,
        previousScanAt: exactMatch.createdAt,
        repeatedParams,
      };
    }

    if (repeatedParams.length > 1) {
      return {
        status: "Multiple Repeated Parameters",
        details: repeatedParams.map((p) => `${p.param} (${p.value}) already used with ${p.description}`).join(" | "),
        duplicateCount: 1,
        previousScanAt: null,
        repeatedParams,
      };
    }

    if (repeatedParams.length === 1) {
      const p = repeatedParams[0];
      return {
        status: `Repeated ${p.param}`,
        details: `${p.param} (${p.value}) already used with ${p.description}`,
        duplicateCount: 1,
        previousScanAt: null,
        repeatedParams,
      };
    }

    return fallback;
  } catch (err) {
    return fallback;
  }
}