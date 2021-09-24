/* NodeJS modules */
import stdio = require("stdio");

/* project files */
import { launchNodemon } from "./nodemon";

const EXIT_NODEMON_FAILURE = 3;

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
    launchNodemon(options.nodemonConf.toString()).catch((err) => {
      console.log(err);
      process.exit(EXIT_NODEMON_FAILURE);
    });
  }
}

main();
