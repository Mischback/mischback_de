/* NodeJS modules */
import stdio = require("stdio");

/* project files */
import { launchNodemon } from "./nodemon";
import { launchHttpServer } from "./http-server";

const EXIT_NODEMON_FAILURE = 3;
const EXIT_HTTPSERVER_FAILURE = 4;

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
    serverAddress: {
      description: "Serve http at this address",
      required: false,
      args: 1,
      default: "127.0.0.1",
    },
    serverPort: {
      description: "Serve http at this port",
      required: false,
      args: 1,
      default: "8000",
    },
  });

  if (options !== null) {
    launchNodemon(options.nodemonConf.toString()).catch((err) => {
      console.log(err);
      process.exit(EXIT_NODEMON_FAILURE);
    });

    launchHttpServer(
      options.webRoot.toString(),
      options.serverAddress.toString(),
      parseInt(options.serverPort.toString())
    ).catch((err) => {
      console.log(err);
      process.exit(EXIT_HTTPSERVER_FAILURE);
    });
  }
}

main();
