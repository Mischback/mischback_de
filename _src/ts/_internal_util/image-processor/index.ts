/* NodeJS imports */
import { readFileSync } from "fs";
import { getopt } from "stdio";
import { Logger } from "tslog";

const EXIT_SUCCESS = 0;
const EXIT_IMAGE_PROCESSOR_FAILURE = 6;

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

function sharpWrapper(
  config: any,
  inputFile: string,
  outputDir: string
): Promise<void> {
  logger.debug(config);
  logger.debug(inputFile);
  logger.debug(outputDir);

  return new Promise((resolve) => {
    return resolve();
  });
}

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

    logger.debug("Running with the following configuration options:");
    logger.debug("Config: " + options.configFile.toString());
    logger.debug("inputFile: " + options.inputFile.toString());
    logger.debug("outputDir: " + options.outputDir.toString());

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const config = JSON.parse(
      readFileSync(options.configFile.toString(), "utf-8")
    );

    sharpWrapper(
      config,
      options.inputFile.toString(),
      options.outputDir.toString()
    )
      .then(() => {
        logger.info(
          'Finished processing of input file "' +
            options.inputFile.toString() +
            '"!'
        );
        process.exit(EXIT_SUCCESS);
      })
      .catch((err) => {
        logger.fatal("Something went terribly wrong!");
        logger.trace(err);
        process.exit(EXIT_IMAGE_PROCESSOR_FAILURE);
      });
  }
}

main();
