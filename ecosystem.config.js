const MQTTConfig = require("./config/MQTTClient/config");

module.exports = {
  apps: [
    {
      script: "./MQTTClient/index.js",
      watch: ["./MQTTClient", "./config/MQTTClient"],
      env: {
        service_config: JSON.stringify(MQTTConfig),
      },
      env_production: {
        service_config: JSON.stringify(MQTTConfig),
      },
    },
  ],

  deploy: {},
};
