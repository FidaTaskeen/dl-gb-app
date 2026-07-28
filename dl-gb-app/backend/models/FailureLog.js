import mongoose from "mongoose";

// Kept entirely separate from Record so that clearing the Failure Log never
// touches the main Records collection (and therefore never affects the main
// Reports page or the Duplicate Report page).
const failureLogSchema = new mongoose.Schema(
  {
    recordId: { type: mongoose.Schema.Types.ObjectId, ref: "Record", index: true },
    protocol: { type: String, enum: ["Modbus", "Zigbee"], index: true },
    rsn: { type: String, index: true }, // the device's RSN, for quick reference/search regardless of which field failed
    fieldName: { type: String, index: true }, // RSN / IMEI / EAN / ICCID / MACID
    dlValue: String,
    gbValue: String,
    failureReason: String, // full mismatch string for the whole scan, e.g. "IMEI,ICCID"
    duplicateStatus: { type: String, default: "" },
    duplicateDetails: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("FailureLog", failureLogSchema);