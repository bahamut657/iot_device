const os = require("os");

module.exports = {
  connection: {
    host: "mqtt://madlab-pi.lan",
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
