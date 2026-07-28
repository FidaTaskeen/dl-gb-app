import mongoose from "mongoose";

const failureLogSchema = new mongoose.Schema(
  {
    protocol: { type: String, enum: ["Modbus", "Zigbee"], default: "Modbus" },
    failureType: { type: String, enum: ["MISMATCH", "DUPLICATE"], required: true },
    failureReason: { type: String, required: true },
    fieldName: { type: String, required: true },
    scannedValue: { type: String, default: "" },
    dlValue: String,
    gbValue: String,
    relatedRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "Record", default: null },
    relatedRsn: String,
    relatedImei: String,
    relatedIccid: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("FailureLog", failureLogSchema);