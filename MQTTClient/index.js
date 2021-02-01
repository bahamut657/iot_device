const { MQTTClient } = require("./MQTTClient");
const service = new MQTTClient(JSON.parse(process.env.service_config));
