const fs = require("fs");

class MQTTfs {
  constructor(props) {
    this.config = {
      path: null,
      basepath: null,
      ...props,
    };
    this.state = {
      baseFullPath: null,
    };
    this.startup();
  }

  startup() {
    this.state.baseFullPath = this.config.basepath + this.config.path;
  }

  destroy() {}

  fs_available_entries() {
    return new Promise((resolve, reject) => {
      const { path } = this.config;
      const output = {
        allPaths: [],
        byPath: {},
      };

      this.fs_loop_dir({
        path: this.state.baseFullPath,
        output,
        parentOutput: output.byPath,
      });

      resolve(JSON.stringify(output, false, "\t"));
    });
  }

  fs_loop_dir({ path, output, parentOutput = null }) {
    try {
      const files = fs.readdirSync(path);

      files.forEach((file) => {
        const fullPath = (path + "/" + file).slice(
          this.state.baseFullPath.length
        );
        console.log(fullPath, "is");
        let p_output = output.byPath;
        if (fs.statSync(this.state.baseFullPath + fullPath).isDirectory()) {
          console.log(fullPath, "is dir");
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
          if (output.allPaths.indexOf(fileName) < 0) {
            p_output[fileName] = {
              isFile: true,
              extension: extension,
            };
            output.allPaths.push(fullPath);
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
