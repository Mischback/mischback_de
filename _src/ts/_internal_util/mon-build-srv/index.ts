/* NodeJS modules */
import nodemon = require("nodemon");
import fs = require("fs");
//import path = require("path");
import stdio = require("stdio");

/* project files */
import { DevBMSConfigError } from "../errors";

const EXIT_NODEMON_FAILURE = 3;

function setupNodemon(nodemonConfigFile: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    console.log("Setting up Nodemon...");

    readNodemonConfig(nodemonConfigFile)
      .then((nodemon_conf) => {
        nodemon(nodemon_conf);

        nodemon
          .on("start", () => {
            console.log("[nodemon] started...");
          })
          .on("quit", () => {
            console.log("[nodemon] stopped...");
            process.exit();
          })
          .on("restart", (files) => {
            console.log("[nodemon] restarted due to: ", files);
          });
        return resolve(true);
      })
      .catch((err) => {
        return reject(err);
      });
  });
}

function readNodemonConfig(nodemonConfigFile: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(nodemonConfigFile, (err, data) => {
      if (err) return reject(err);

      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const nodemon_conf = JSON.parse(data.toString());
        return resolve(nodemon_conf);
      } catch {
        return reject(
          new DevBMSConfigError("Could not parse nodemon configuration")
        );
      }
    });
  });
}

function main(): void {
  const options = stdio.getopt({
    nodemonConf: {
      description: "Use this config file for nodemon",
      required: false,
      args: 1,
      default: "./nodemon.json",
    },
    webRoot: {
      description: "Serve http from this directory",
      required: false,
      args: 1,
      default: "./",
    },
  });

  if (options !== null) {
    setupNodemon(options.nodemonConf.toString()).catch((err) => {
      console.log(err);
      process.exit(EXIT_NODEMON_FAILURE);
    });
  }
}

main();
