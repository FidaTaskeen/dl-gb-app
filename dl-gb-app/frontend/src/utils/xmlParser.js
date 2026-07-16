export function parseLabelXml(xmlText) {
  const get = (tag) => {
    const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
    const match = xmlText.match(regex);
    return match ? match[1].trim() : "";
  };

  return {
    mfrName: get("MFRNAME"),
    modelNo: get("MODELNO"),
    srno: get("SRNO"),
    imei: get("IMEI"),
    ean: get("EAN"),
    iccid: get("ICCID"),
    macId: get("MACID"),
    circleCode: get("CIRCLECODE"),
    price: get("MRP"),
  };
}