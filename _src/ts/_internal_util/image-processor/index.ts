/* NodeJS imports */
import { createReadStream, readFileSync } from "fs";
import { basename, extname, join } from "path";
const sharp = require("sharp");
import { getopt } from "stdio";
import { Logger } from "tslog";

const EXIT_SUCCESS = 0;
const EXIT_IMAGE_PROCESSOR_FAILURE = 6;

interface extensionsDict {
  [index: string]: string;
}

const fileExtensions: extensionsDict = {
  "gif": ".gif",
  "jpeg": ".jpg",
  "jpg": ".jpg",
  "png": ".png",
  "webp": ".webp",
};

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

  return new Promise((resolve, reject) => {
    const sharpStream = new sharp({
      failOnError: true
    });

    const sharpPipes: any[] = [];

    const fileBasename = basename(inputFile, extname(inputFile));

    Object.keys(config.target_types).forEach((t) => {

      const filetype = t.toString().toLowerCase();
      const filetype_options = config.target_types[t];
      const filetype_extension = fileExtensions[filetype];

      Object.keys(config.target_dimensions).forEach((d) => {
        const dim = config.target_dimensions[d];

        let pipe = sharpStream.clone();

        let newFilename: string;

        if (dim.mode !== "full") {
          if (dim.mode === "width")
            pipe = pipe.resize({ width: dim.width });
          if (dim.mode === "height")
            pipe = pipe.resize({ height: dim.height });

          newFilename = fileBasename + dim.filenameSuffix + filetype_extension;
        } else {
          newFilename = fileBasename + filetype_extension;
        }

        pipe = pipe
          .toFormat(filetype, filetype_options)
          .toFile(join(outputDir, newFilename));

        logger.debug("Built pipe to create \"" + newFilename + "\" from \"" + inputFile + "\"...");

        sharpPipes.push(pipe);
      });
    });

    const readStream = createReadStream(inputFile);
    readStream.on("open", () => {
      logger.debug("Opened \"" + inputFile + "\" and piping into Sharp...");
      readStream.pipe(sharpStream);
    });
    readStream.on("error", (err) => {
      logger.error("Error while reading input stream:");
      logger.fatal(err);
      return reject("foo");
    });

    Promise.all(sharpPipes)
      .then(() => {
        logger.debug("Processed all pipes for source file \"" + inputFile + "\"...");
        return resolve();
      })
      .catch((err) => {
        logger.error("Error while processing the pipes...");
        logger.fatal(err);
        return reject("foo");
      });
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
