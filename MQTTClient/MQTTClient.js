const mqtt = require("mqtt");
const { MQTTfs } = require("./MQTTfs");
const { ProcessSpawner } = require("./ProcessSpawner");
const { HADevice } = require("./HADevice");

const CONNECTION_TIMEOUT = 5000;
const IDLE_TIMEOUT = 5000;
const CB_EXEC_TIMEOUT = 10000;
const PUBLISH_INTERVAL = 30000;

const MQTT_DEFAULT_SCHEMA = ["PREFIX", "DEVICENAME"];
const HA_DEFAULT_PREFIX = "homeassistant/";

class MQTTClient {
  constructor(props) {
    this.config = {
      connection: {
        host: null,
        port: null,
        username: null,
        password: null,
      },
      timeout: {
        connect: CONNECTION_TIMEOUT,
        idle: IDLE_TIMEOUT,
        cbExecTimeout: CB_EXEC_TIMEOUT,
        publish: PUBLISH_INTERVAL,
      },

      publishfs: null,
      subscribefs: null,
      basepath: null,
      deviceName: null,
      mqttPrefix: "",
      mqttURLSchema: MQTT_DEFAULT_SCHEMA,
      homeAssistant: {
        mode: null,
        prefix: HA_DEFAULT_PREFIX,
      },
      ...props,
    };
    this.state = {
      connecting: false,
      connected: false,
      subscribedTopicList: [],
      queues: {
        onConnect: [],
      },
      timeout: {
        connect: null,
        idle: null,
        publish: null,
      },
      publishfs: null,
      subscribefs: null,
      homeAssistantDevice: null,
    };
    this.startup();
  }

  startup() {
    console.log("MQTTClient started");
    this.spawner_start();
    this.fs_start();
    this.external_integration();
  }

  destroy() {
    if (this.state.publishfs) this.state.publishfs.destroy();
    if (this.state.subscribefs) this.state.subscribefs.destroy();
    for (let timeKey in this.state.timeout)
      this.clear_timeout({ type: timeKey });
    if (this.state.connected || this.state.connecting) {
      this.mqtt_disconnect({ force: true });
    }
  }

  spawner_start() {
    this.state.spawner = new ProcessSpawner({
      basepath: this.config.basepath,
      maxExecTime: this.config.timeout.cbExecTimeout,
    });
  }

  fs_start() {
    if (this.config.publishfs) {
      this.state.publishfs = new MQTTfs({
        path: this.config.publishfs,
        basepath: this.config.basepath,
        cb: {
          error: (e) => {
            console.log("PublishFS Error: ", e);
          },
          ready: () => {
            console.log("PublishFS is ready");
            this.state_publish();
          },
        },
      });
    }

    if (this.config.subscribefs) {
      this.state.subscribefs = new MQTTfs({
        path: this.config.subscribefs,
        basepath: this.config.basepath,
        cb: {
          error: (e) => {
            console.log("SubscribeFS Error: ", e);
          },
          ready: () => {
            console.log("SubscribeFS is ready");
            this.state_subscribe();
          },
        },
      });
    }
  }

  url_build({ uri }) {
    const {
      mqttPrefix = "",
      deviceName = "",
      mqttURLSchema = MQTT_DEFAULT_SCHEMA,
    } = this.config;
    let url = "";
    mqttURLSchema.forEach((chunk) => {
      switch (chunk.toUpperCase()) {
        case "PREFIX":
          url += mqttPrefix;
          break;
        case "DEVICENAME":
          url += deviceName;
          break;
        default:
        //not managed - future usage
      }
    });
    url += uri;
    return url;
  }

  state_subscribe() {
    const { subscribefs } = this.config;
    const { allPaths, byPath } = this.state.subscribefs.get_fs();
    this.clear_timeout({ type: "idle" });
    this.check_connection()
      .then(() => {
        if (allPaths.length) {
          const mqttURL = this.url_build({ uri: filePath });
          allPaths.forEach((filePath) => {
            console.log("Subscribing to....", `${mqttURL}`);
            this.state.client.subscribe(`${mqttURL}`);
            this.state.subscribedTopicList.push(filePath);
          });
        }
      })
      .catch((e) => {
        console.log("SubscribeFS: Error connecting MQTT", e);
      });
  }

  state_publish() {
    this.exec_publish()
      .then(() => {})
      .catch((e) => {
        console.log("PublishFS: Error during publish", e);
      })
      .finally(() => {
        this.next_state_publish();
      });
  }

  next_state_publish() {
    this.set_timeout({
      type: "publish",
      cb: () => {
        this.exec_publish();
      },
    });
  }

  exec_publish() {
    return new Promise((resolve, reject) => {
      const { publishfs } = this.config;
      const { allPaths, byPath } = this.state.publishfs.get_fs();
      const promiseList = [];

      allPaths.forEach((filePath) => {
        this.ext_register_path({
          filePath,
          definition: byPath[filePath],
          mode: "publish",
        });
        const execPromise = this.state.spawner.exec_file({
          filePath: publishfs + filePath + byPath[filePath].extension,
          metaInfo: { ...byPath[filePath] },
        });
        promiseList.push(execPromise);
        execPromise
          .then(({ exit, stdout, stderr }) => {
            if (!exit) {
              this.mqtt_publish({
                topic: filePath,
                message: stdout,
              });
            } else {
              console.log("PublishFS: Exec error, exit code " + exit, stderr);
            }
          })
          .catch((e) => {
            console.log("PublishFS: Exec error", e);
          });
      });
      this.all_settled({ promiseList })
        .then(() => {
          resolve();
        })
        .catch((e) => {
          reject(e);
        });
    });
  }

  set_connected(value) {
    if (this.state.connected !== value) {
      this.state.connected = value;
      if (this.state.connected) this.set_connecting(false);
    }
  }

  set_connecting(value) {
    if (this.state.connecting !== value) this.state.connecting = value;
  }

  clear_timeout({ type }) {
    clearTimeout(this.state.timeout[type]);
  }

  set_timeout({ type, cb }) {
    this.clear_timeout({ type });
    this.state.timeout[type] = setTimeout(() => {
      console.log("timeout succedeed", type, cb);
      cb();
    }, this.config.timeout[type]);
  }

  set_idle_timeout({ cb }) {
    if (!this.state.subscribedTopicList.length) {
      this.set_timeout({ type: "idle", cb });
    } else {
      this.clear_timeout({ type: "idle" });
    }
  }

  check_connection() {
    return new Promise((resolve, reject) =>
      this.state.connected
        ? resolve()
        : this.wait_connection({ resolve, reject })
    );
  }

  wait_connection({ resolve, reject }) {
    this.state.queues.onConnect.push({ resolve, reject });
    if (!this.state.connecting) this.connect();
  }

  mqtt_disconnect({ force = false }) {
    if (this.state.client) {
      this.state.client.end(force);
      this.state.client = null;
    }
  }

  connect() {
    const { host, port, timeout, ...options } = this.config.connection;
    this.set_connecting(true);
    this.state.client = mqtt.connect(host, options);
    this.set_timeout({
      type: "connect",
      cb: () => {
        this.set_connecting(false);
        this.state.queues.onConnect.forEach((promise) =>
          promise.reject(
            new Error(`Timeout connecting MQTT to ${host}:${port}`)
          )
        );
        this.state.queues.onConnect = [];
      },
    });
    this.state.client.on("connect", (connInfo) => {
      this.clear_timeout({
        type: "connect",
      });
      this.set_idle_timeout({ cb: () => this.mqtt_disconnect() });
      this.set_connected(true);

      this.state.queues.onConnect.forEach((promise) => promise.resolve());
      this.state.queues.onConnect = [];
    });
    this.state.client.on("close", () => this.set_connected(false));
    this.state.client.on("message", (topic, message) =>
      this.recv({ topic, message })
    );
  }

  mqtt_publish({ topic, message = "", qos = 0 }) {
    return new Promise((resolve, reject) => {
      this.clear_timeout({ type: "idle" });
      this.check_connection()
        .then(() => {
          const mqttURL = this.url_build({ uri: topic });
          this.state.client.publish(mqttURL, message, { qos }, (err) => {
            this.set_idle_timeout({
              type: "idle",
              cb: () => this.mqtt_disconnect(),
            });
            return err ? reject(err) : resolve();
          });
        })
        .catch((e) => {
          console.log("error connecting MQTT server", e);
        });
    });
  }

  recv({ topic, message }) {
    const { subscribefs, mqttPrefix, deviceName } = this.config;
    const { allPaths, byPath } = this.state.subscribefs.get_fs();
    const path = topic.slice(`${mqttPrefix}${deviceName}`.length);
    if (allPaths.indexOf(path) >= 0) {
      console.log("Executing ", subscribefs + path + byPath[path].extension);
      const execPromise = this.state.spawner.exec_file({
        filePath: subscribefs + path + byPath[path].extension,
        metaInfo: { ...byPath[path] },
      });
    }
  }

  all_settled({ promiseList }) {
    let wrappedPromises = promiseList.map((p) =>
      Promise.resolve(p).then(
        (val) => ({ status: "fulfilled", value: val }),
        (err) => ({ status: "rejected", reason: err })
      )
    );
    return Promise.all(wrappedPromises);
  }

  external_integration() {
    this.ext_home_assistant();
  }

  ext_home_assistant() {
    const {
      deviceName = "",
      homeAssistant = { mode: null, prefix: HA_DEFAULT_PREFIX },
    } = this.config;
    const { mode = null, prefix = HA_DEFAULT_PREFIX } = homeAssistant;
    const { publish = PUBLISH_INTERVAL } = this.config.timeout;
    if (mode) {
      this.state.homeAssistantDevice = new HADevice({
        mode,
        prefix,
        deviceName,
        publishTimeoutInterval: publish,
      });
    }
  }
  ext_register_path({ filePath, definition, mode = "publish" }) {
    if (this.state.homeAssistantDevice) {
      this.state.homeAssistantDevice.register_endpoint({
        endPointList: [filePath],
        mode,
      });
    }
  }
}
module.exports = { MQTTClient };
