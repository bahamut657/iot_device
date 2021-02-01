const fs = require("fs");

class MQTTfs {
  constructor(props) {
    this.config = {
      path: null,
      basepath: null,
      cb: {
        ready: null,
        error: null,
      },
      ...props,
    };
    this.state = {
      baseFullPath: null,
      cache: {
        allPaths: [],
        byPath: {},
      },
    };
    this.startup();
  }

  startup() {
    this.state.baseFullPath = this.config.basepath + this.config.path;
    this.fs_available_entries()
      .then(() => this.fs_ready())
      .catch((e) => this.fs_error(e));
  }

  destroy() {}

  get_fs() {
    return {
      allPaths: this.state.cache.allPaths.slice(),
      byPath: { ...this.state.cache.byPath },
      treePath: { ...this.state.cache.treePath },
    };
  }

  fs_ready() {
    const { cb = {} } = this.config;
    const { ready } = cb;
    if (typeof ready === "function") ready();
  }

  fs_error(e) {
    const { cb = {} } = this.config;
    const { error } = cb;
    if (typeof error === "function") error(e);
  }

  fs_available_entries() {
    return new Promise((resolve, reject) => {
      const { path } = this.config;
      const output = {
        allPaths: [],
        byPath: {},
        treePath: {},
      };

      this.fs_loop_dir({
        path: this.state.baseFullPath,
        output,
        parentOutput: output.treePath,
      });
      this.state.cache.allPaths = output.allPaths;
      this.state.cache.byPath = output.byPath;
      this.state.cache.treePath = output.byPath;
      resolve();
    });
  }

  fs_loop_dir({ path, output, parentOutput = null }) {
    try {
      const files = fs.readdirSync(path);

      files.forEach((file) => {
        const fullPath = (path + "/" + file).slice(
          this.state.baseFullPath.length
        );
        let p_output = output.treePath;
        if (fs.statSync(this.state.baseFullPath + fullPath).isDirectory()) {
          fullPath.split("/").forEach((chunk) => {
            if (chunk) {
              if (!p_output[chunk]) p_output[chunk] = {};
              p_output = p_output[chunk];
            }
          });

          this.fs_loop_dir({
            path: this.state.baseFullPath + fullPath,
            output,
            parentOutput: p_output,
          });
        } else {
          path
            .slice(this.state.baseFullPath.length)
            .split("/")
            .forEach((chunk) => {
              if (chunk) {
                if (!p_output[chunk]) p_output[chunk] = {};
                p_output = p_output[chunk];
              }
            });
          const dotIdx = file.indexOf(".");
          const fileName = dotIdx >= 0 ? file.slice(0, dotIdx) : file;
          const extension = dotIdx >= 0 ? file.slice(dotIdx) : "";
          const cleanPath = fullPath.slice(0, -file.length) + fileName;
          if (output.allPaths.indexOf(cleanPath) < 0) {
            output.byPath[cleanPath] = p_output[fileName] = {
              isFile: true,
              fileName: fileName,
              extension: extension,
            };
            output.allPaths.push(cleanPath);
          } else {
            console.log(
              `Duplicate topic script found for ${fileName}[${p_output[fileName].extension}] -> ${file} will be ignored`
            );
          }
        }
      });
    } catch (err) {
      console.log(`Error reading ${path}`, err);
    }
  }

  fs_exists() {}
}

module.exports = { MQTTfs };
