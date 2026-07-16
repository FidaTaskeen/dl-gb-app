import mongoose from "mongoose";

const recordSchema = new mongoose.Schema(
  {
    protocol: { type: String, enum: ["Modbus", "Zigbee"], default: "Modbus" },
    dl: {
      raw: { type: String, required: true },
      mfrName: String,
      modelNo: String,
      srno: String,
      imei: String,
      ean: String,
      iccid: String,
      macId: String,
      circleCode: String,
    },
    gb: {
      raw: { type: String, required: true },
      mfrName: String,
      modelNo: String,
      srno: String,
      imei: String,
      ean: String,
      iccid: String,
      macId: String,
      circleCode: String,
      price: String,
    },
    status: { type: String, enum: ["PASS", "FAIL"], required: true },
    mismatchParams: { type: String, default: "OK" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

recordSchema.pre("validate", function (next) {
  const mismatches = [];

  if (this.dl.imei !== this.gb.imei) mismatches.push("IMEI");
  if (this.dl.ean !== this.gb.ean) mismatches.push("EAN");
  if (this.dl.srno !== this.gb.srno) mismatches.push("RSN");
  if (this.protocol === "Zigbee" && this.dl.macId !== this.gb.macId) mismatches.push("MACID");

  this.status = mismatches.length === 0 ? "PASS" : "FAIL";
  this.mismatchParams = mismatches.length === 0 ? "OK" : mismatches.join(",");

  next();
});

export default mongoose.model("Record", recordSchema);