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

  // TEMPORARY DEBUG — shows exact character codes to catch hidden
  // whitespace/invisible characters that make strings look equal
  // but aren't, or vice versa.
  const dlIccid = this.dl.iccid || "";
  const gbIccid = this.gb.iccid || "";
  console.log("=== ICCID debug ===");
  console.log("DL ICCID raw:", JSON.stringify(dlIccid), "length:", dlIccid.length);
  console.log("GB ICCID raw:", JSON.stringify(gbIccid), "length:", gbIccid.length);
  console.log("DL char codes:", [...dlIccid].map((c) => c.charCodeAt(0)));
  console.log("GB char codes:", [...gbIccid].map((c) => c.charCodeAt(0)));
  console.log("Strict equal?", dlIccid === gbIccid);

  if (this.dl.imei !== this.gb.imei) mismatches.push("IMEI");
  if (this.dl.ean !== this.gb.ean) mismatches.push("EAN");
  if (this.dl.srno !== this.gb.srno) mismatches.push("RSN");
  if (dlIccid !== gbIccid) mismatches.push("ICCID");
  if (this.protocol === "Zigbee" && this.dl.macId !== this.gb.macId) mismatches.push("MACID");

  this.status = mismatches.length === 0 ? "PASS" : "FAIL";
  this.mismatchParams = mismatches.length === 0 ? "OK" : mismatches.join(",");

  next();
});

export default mongoose.model("Record", recordSchema);