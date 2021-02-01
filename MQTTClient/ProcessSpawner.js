const TMP_DIR = "/tmp/";
const cp = require("child_process");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

class ProcessSpawner {
  constructor(props) {
    this.config = {
      basepath: null,
      maxExecTime: 0,
      tmpDir: TMP_DIR,
      ...props,
    };
    this.state = {
      queue: [],
      queueActive: false,
    };
    this.startup();
  }

  startup() {}

  exec_file(props) {
    return new Promise((resolve, reject) => {
      console.log("Requesting", props);
      const ts = Date.now();
      this.add_queue({
        entry: props,
        ts,
        promise: { resolve, reject },
      });
    });
  }

  add_queue(queueEntry) {
    this.state.queue.push(queueEntry);
    if (!this.state.queueActive) {
      this.set_active_queue(true);
      this.exec_queue();
    }
  }

  exec_queue() {
    if (this.state.queue.length) {
      const entry = this.state.queue.shift();
      this.queue_exec_file(entry);
    } else {
      this.set_active_queue(false);
    }
  }

  set_active_queue(state) {
    this.state.queueActive = state;
  }

  queue_exec_file({ entry, ts, promise }) {
    const executionId = uuidv4();
    const { basepath } = this.config;
    const { filePath, metaInfo } = entry;
    const { fileName, extension } = metaInfo;
    console.log("QUEUE EXEC", basepath + filePath);
    this.clone_file({
      filePath: basepath + filePath,
      metaInfo,
      executionId,
    })
      .then(({ execFilePath }) => {
        const child = cp.spawn(execFilePath, []);
        const output = {
          out: [],
          err: [],
          exit: null,
          signal: null,
        };

        child.stdout.on("data", (data) => output.out.push(data));
        child.stderr.on("data", (data) => output.err.push(data));
        child.on("close", (code, signal) => {
          output.exit = code;
          output.signal = signal;
          const execTime = Date.now() - ts;
          console.log(`${filePath} executed in ${execTime} [${execFilePath}]`);
          promise.resolve({
            ...output,
            stdout: output.out.join(""),
            stderr: output.err.join(""),
          });
          this.clean_executed_file({
            filePath,
            metaInfo,
            executionId,
            execFilePath,
          }).finally(() => this.exec_queue());
        });
      })
      .catch((e) => {
        promise.reject(e);
      });
  }

  clone_file({ filePath, metaInfo, executionId }) {
    return new Promise((resolve, reject) =>
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          reject(err);
        } else {
          const { fileName, extension } = metaInfo;
          const execFilePath = `${this.config.tmpDir}${executionId}${extension}`;
          fs.writeFile(
            execFilePath,
            data,
            {
              encoding: "utf8",
              mode: 0o777,
              flag: "w+",
            },
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  execFilePath,
                });
              }
            }
          );
        }
      })
    );
  }

  clean_executed_file({ filePath, metaInfo, executionId, execFilePath }) {
    return new Promise((resolve, reject) => {
      fs.unlink(execFilePath, (err) => (err ? reject(err) : resolve()));
    });
  }
}
module.exports = { ProcessSpawner };
