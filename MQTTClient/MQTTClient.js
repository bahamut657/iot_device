const mqtt = require("mqtt");

const CONNECTION_TIMEOUT = 5000;
const IDLE_TIMEOUT = 10000;

class MQTTClient {
  constructor(props) {
    this.config = {
      host: null,
      port: null,
      username: null,
      password: null,
      timeout: {
        connect: CONNECTION_TIMEOUT,
        idle: IDLE_TIMEOUT,
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
      },
    };
    this.startup();
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
      cb();
    }, this.config.timeout[type]);
  }

  startup() {
    console.log("MQTTClient started");
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

  connect() {
    const { host, port, timeout, ...options } = this.config;
    this.set_connecting(true);
    this.state.client = mqtt.connect({ host, port }, options);
    this.set_timeout({
      type: "connect",
      cb: () => {
        this.set_connecting(false);
        this.state.queues.onConnect.forEach((promise) =>
          promise.reject(
            new Error(
              `Timeout connecting MQTT to ${this.config.host}:${this.config.port}`
            )
          )
        );
        this.state.queues.onConnect = [];
      },
    });
    this.state.client.on("connect", (err) => {
      this.clear_timeout({
        type: "connect",
      });
      if (!err) this.set_connected(true);
      else this.set_connecting(false);
      this.state.queues.onConnect.forEach((promise) =>
        err ? promise.reject(err) : promise.resolve()
      );
      this.state.queues.onConnect = [];
    });
    this.state.client.on("close", () => this.set_connected(false));
    this.state.client.on("message", (topic, message) =>
      this.recv({ topic, message })
    );
  }

  publish({ topic, message = "", qos = 0 }) {
    return new Promise((resolve, reject) =>
      this.check_connection().then(() => {
        this.state.client.publish(topic, message, { qos }, (err) =>
          err ? reject(err) : resolve()
        );
      })
    );
  }

  recv({ topic, message }) {}
}
module.exports = { MQTTClient };
