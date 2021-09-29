/* NodeJS imports */
import { getopt } from "stdio";
import { Logger } from "tslog";

const logger = new Logger({
  name: "image-processor",
  displayLoggerName: true,
  minLevel: "debug",
  dateTimePattern: "hour:minute:second",
  dateTimeTimezone: "Europe/Berlin",
  displayFunctionName: false,
  displayFilePath: "hidden",
});

function main(): void {
  const options = getopt({
    configFile: {
      description: "path/filename of the config file",
      required: false,
      args: 1,
      default: "image-processor.json",
    },
  });

  if (options !== null) {
    logger.debug("Config: " + options.configFile.toString());
  }
}

main();
