const os = require("os");

module.exports = {
  connection: {
    host: "mqtt://<MQTTHOST>",
    username: "<MQTTUSER>",
    password: "<MQTTPWD>",
  },
  basepath: __dirname,
  publishfs: "/publishfs/",
  subscribefs: "/subscribefs/",

  mqttPrefix: "mad-mqtt/",
  deviceName: os.hostname(),

  mqttURLSchema: ["PREFIX", "DEVICENAME"],
};
