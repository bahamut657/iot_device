const os = require("os");

module.exports = {
  connection: {
    host: "mqtt://madlab-pi.lan",
    username: "mad-device",
    password: "24mad1986",
  },
  basepath: __dirname,
  publishfs: "/publishfs/",
  subscribefs: "/subscribefs/",

  mqttPrefix: "mad-mqtt/",
  deviceName: os.hostname(),
};
