const SENSOR_DEFAULT_NAME = "binary_sensor";
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
    return uri.replace(r, "_").replace(r1, "_");
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
    const url = this.url_build({
      uri,
    });
  }

  exec_publish_endpoint_config({ uri }) {
    return new Promise((resolve, reject) => {
      const url = this.url_build({ uri });
      const data = {
        name: "garden1",
        device_class: "motion",
        state_topic: "homeassistant/binary_sensor/garden/state",
      };
    });
  }
  url_build({ uri = "" }) {
    let url = "";
    url += this.config.prefix;
    url += SENSOR_DEFAULT_NAME + "/";

    url += uri; //uri = <nodeId>/<objectId> (nodeId e' opzionale)
    return url;
  }
}

module.exports = { HADevice };
