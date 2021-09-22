/* NodeJS modules */
// import nodemon = require("nodemon");
import fs = require("fs");
import path = require("path");
import stdio = require("stdio");

const EXIT_CONFIG_FAILURE = 3;

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

  const config = {
    nodemonConf: "./nodemon.json",
    webRoot: "./",
  };

  if (options !== null) {
    try {
      fs.accessSync(
        path.resolve(options.nodemonConf.toString()),
        fs.constants.R_OK
      );
      config.nodemonConf = path.resolve(options.nodemonConf.toString());
    } catch (err) {
      console.error("Could not read nodemon configuration!");
      process.exit(EXIT_CONFIG_FAILURE);
    }

    try {
      fs.accessSync(
        path.resolve(options.webRoot.toString()),
        fs.constants.R_OK
      );
      config.webRoot = path.resolve(options.webRoot.toString());
    } catch (err) {
      console.error("The specified webRoot could not be read!");
      process.exit(EXIT_CONFIG_FAILURE);
    }
  }

  try {
    const buffer = fs.readFileSync(config.nodemonConf, "utf-8");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const nodemon_conf = JSON.parse(buffer.toString());
    console.log(nodemon_conf);
  } catch (err) {
    console.error("Could not parse nodemon configuration!");
    process.exit(EXIT_CONFIG_FAILURE);
  }
}

main();
