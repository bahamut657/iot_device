const { MQTTClient } = require("./MQTTClient");
const service = MQTTClient(JSON.parse(process.env.service_config));
