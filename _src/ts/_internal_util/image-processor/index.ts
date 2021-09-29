/* NodeJS imports */
import { getopt } from "stdio";
import { Logger } from "tslog";

/* setting up the logger */
const logger = new Logger({
  name: "image-processor",
  displayLoggerName: true,
  minLevel: "info",
  dateTimePattern: "hour:minute:second",
  dateTimeTimezone: "Europe/Berlin",
  displayFunctionName: false,
  displayFilePath: "hidden",
});

function main(): void {
  const options = getopt({
    configFile: {
      description: "path/filename of the config file",
      key: "c",
      required: false,
      args: 1,
      default: "image-processor.json",
    },
    debug: {
      description: "Activate debug mode",
      key: "d",
      required: false,
      default: false,
    },
    inputFile: {
      description: "Path/filename of the input file",
      key: "i",
      required: true,
      args: 1,
    },
    outputDir: {
      description: "Path of the output directory",
      key: "o",
      required: true,
      args: 1,
    },
  });

  if (options !== null) {
    if (options.debug === true) {
      logger.info("Debug mode activated!");
      logger.setSettings({
        minLevel: "debug",
        displayFunctionName: true,
        displayFilePath: "hideNodeModulesOnly",
      });
    }

    logger.debug("Config: " + options.configFile.toString());
    logger.debug("inputFile: " + options.inputFile.toString());
    logger.debug("outputDir: " + options.outputDir.toString());
  }
}

main();
