const SENSOR_DEFAULT_NAME = "device_tracker";
const PUBLISH_INTERVAL = 30000;

class HADevice {
  constructor(props) {
    this.config = {
      mode: null,
      prefix: "",
      deviceName: "",
      publishTimeoutInterval: PUBLISH_INTERVAL,
      cb: {
        mqttPublish: null,
        mqttSubscribe: null,
      },
      ...props,
    };
    this.state = {
      mode: null,
      registeredEndPoints: {
        publish: {
          list: [],
          endPointByTopic: {},
          topicByEndPoint: {},
          timerByEndPoint: {},
        },
        //subscribe:[]
      },
    };

    this.startup();
  }

  startup() {
    console.log("Nome dispositivo", this.config.deviceName);
    switch (this.config.mode) {
      case "device":
        this.device_config();
        break;
    }
  }

  destroy() {}

  device_config() {
    this.state.mode = "device";
  }

  normalize_uri({ uri }) {
    const r = new RegExp(" ", "g");
    const r1 = new RegExp("/", "g");

    return uri.replace(r, "_").replace(r1, "_").slice(1);
  }

  register_endpoint({ endPointList, mode = "publish" }) {
    endPointList.forEach((chunk) => {
      const uri = this.normalize_uri({ uri: chunk });
      if (this.state.registeredEndPoints[mode].list.indexOf(uri) < 0) {
        this.state.registeredEndPoints[mode].list.push(uri);
        this.state.registeredEndPoints[mode].endPointByTopic[uri] = chunk;
        this.state.registeredEndPoints[mode].topicByEndPoint[chunk] = uri;
        console.log("REGISTRO URI HA: ", uri);
        console.log("URL ORIGINALE HA: ", uri);
        this.publish_endpoint_config({ uri });
      }
    });
  }

  update_state({ endPoint, message, mode = "publish" }) {
    const targetURI = this.state.registeredEndPoints[mode].topicByEndPoint[
      endPoint
    ];
    if (targetURI) {
      this.config.cb.mqttPublish({
        topic: this.url_build({ uri: targetURI, haEndpoint: "state" }),
        message,
      });
    }
  }

  publish_endpoint_config({ uri }) {
    this.exec_publish_endpoint_config({ uri }).finally(() => {
      clearTimeout(this.state.registeredEndPoints.publish.timerByEndPoint[uri]);
      this.state.registeredEndPoints.publish.timerByEndPoint[uri] = setTimeout(
        () => {
          this.publish_endpoint_config({ uri });
        },
        this.config.publishTimeoutInterval
      );
    });
  }

  exec_publish_endpoint_config({ uri }) {
    return new Promise((resolve, reject) => {
      const { deviceName } = this.config;
      const url = this.url_build({ uri, haEndpoint: "config" });
      const stateTopic = this.url_build({ uri, haEndpoint: "state" });
      const r = new RegExp("_", "g");
      const message = {
        name: `[${deviceName}] ${uri.replace(r, "/")}`,
        state_topic: stateTopic,
        value_template: "",
      };
      this.config.cb.mqttPublish({
        message: JSON.stringify(message),
        topic: url,
      });
      resolve();
    });
  }
  url_build({ uri = "", haEndpoint = "" }) {
    const { prefix = "", deviceName = "" } = this.config;
    let url = "";
    url += prefix;
    url += SENSOR_DEFAULT_NAME;
    if (deviceName) url += `/${deviceName}`;
    url += `/${uri}`; //uri = <nodeId>/<objectId> (nodeId e' opzionale)

    if (haEndpoint) url += `/${haEndpoint}`;
    return url;
  }
}

module.exports = { HADevice };
