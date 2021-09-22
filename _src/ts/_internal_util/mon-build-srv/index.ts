/* NodeJS modules */
// import nodemon = require("nodemon");
import path = require("path");
import stdio = require("stdio");

function main(): void {
  const options = stdio.getopt({
    webRoot: {
      description: "Serve http from this directory",
      required: false,
      args: 1,
      default: "./",
    },
  });

  if (options !== null)
    console.log("webRoot: " + path.resolve(options.webRoot.toString()));
}

main();
