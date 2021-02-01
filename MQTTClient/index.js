const { MQTTClient } = require("./MQTTClient");
const config = require("../config/MQTTClient/config");
const service = new MQTTClient(config);
