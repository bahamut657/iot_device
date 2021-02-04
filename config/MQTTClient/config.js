const os = require("os");

module.exports = {
  connection: {
    host: process.env.IOT_MQTTBROKER,
    username: process.env.IOT_MQTTUSER || null,
    password: process.env.IOT_MQTTPWD || null,
  },
  basepath: __dirname,
  publishfs: "/publishfs/",
  subscribefs: "/subscribefs/",

  mqttPrefix: "mad-mqtt/",
  deviceName: os.hostname(),
  mqttURLSchema: ["PREFIX", "DEVICENAME"],
  homeAssistant: {
    mode: "device",
    prefix: "homeassistant/",
  },
};
