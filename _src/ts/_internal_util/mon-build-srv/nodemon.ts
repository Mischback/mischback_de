/* NodeJS modules */
import fs = require("fs");
import nodemon = require("nodemon");

/* project files */
import { DevBMSConfigError } from "../errors";

export function launchNodemon(nodemonConfigFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("Setting up Nodemon...");

    readNodemonConfig(nodemonConfigFile)
      .then((nodemon_conf) => {
        nodemon(nodemon_conf);

        nodemon
          .on("start", () => {
            console.log("[nodemon] started...");
          })
          .on("exit", () => {
            console.log("[nodemon] command finished!");
          })
          .on("quit", () => {
            console.log("[nodemon] stopped...");
            process.exit();
          })
          .on("restart", (files) => {
            console.log("[nodemon] restarted due to: ", files);
          });

        return resolve();
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
          new DevBMSConfigError("Could not parse nodemon configuration!")
        );
      }
    });
  });
}
