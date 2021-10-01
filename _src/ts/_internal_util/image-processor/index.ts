/* NodeJS imports */
import { createReadStream, readFileSync } from "fs";
import { basename, extname, join } from "path";
import { getopt } from "stdio";
import { Logger } from "tslog";

/// <reference types="sharp" />
import sharp = require("sharp");

import {
  parseConfig,
  targetConfig,
  targetFormats,
  ImageProcessorConfig,
} from "./configuration";

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

const TargetFormatExtensions: { [index: string]: string } = {
  gif: ".gif",
  jpeg: ".jpg",
  jpg: ".jpg",
  png: ".png",
  webp: ".webp",
};

function buildPipe(
  sharpPipeEntry: sharp.Sharp,
  fileBasename: string,
  outputDir: string,
  targetFormat: string
): sharp.Sharp {
  let targetSharpFormat: keyof sharp.FormatEnum;
  if (targetFormat in sharp.format)
    targetSharpFormat = targetFormat as keyof sharp.FormatEnum;
  else {
    throw "Unknown target format!";
  }

  const newFilename = fileBasename + TargetFormatExtensions[targetFormat];

  let pipe = sharpPipeEntry.clone();

  pipe = pipe.resize({ width: 200 });

  pipe = pipe.toFormat(targetSharpFormat);

  /* The following line is ignored from TypeScript checks, because they
   * find, that the Promise is not fully populated. Indeed, it will be
   * fully populated, but TypeScript does not know this, because the call
   * to "toFormat()" is performed with a variable filetype.
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  pipe = pipe.toFile(join(outputDir, newFilename));

  logger.debug('Built pipe for "' + newFilename + '"');

  return pipe;
}

function buildSharpPipes(
  sharpPipeEntry: sharp.Sharp,
  fileBasename: string,
  outputDir: string,
  targetConfig: targetConfig
): Promise<sharp.Sharp[]> {
  return new Promise((resolve, reject) => {
    const sharpPipes: sharp.Sharp[] = [];

    for (const target in targetConfig) {
      logger.debug("target loop: " + target);

      const newFileBasename = targetConfig[target].filenameSuffix
        ? fileBasename + targetConfig[target].filenameSuffix
        : fileBasename;

      targetConfig[target].formats.forEach((f: targetFormats) => {
        logger.debug("format loop: " + f);

        try {
          sharpPipes.push(
            buildPipe(sharpPipeEntry, newFileBasename, outputDir, f)
          );
        } catch (err) {
          logger.error("Error during building the pipes!");
          logger.fatal(err);
          return reject("foobar");
        }
      });
    }

    return resolve(sharpPipes);
  });
}

function sharpWrapper(
  inputFile: string,
  outputDir: string,
  targetConfig: targetConfig
): Promise<void> {
  return new Promise((resolve, reject) => {
    const sharpPipeEntry = sharp({
      failOnError: true,
    });

    const fileBasename = basename(inputFile, extname(inputFile));

    buildSharpPipes(sharpPipeEntry, fileBasename, outputDir, targetConfig)
      .then((sharpPipes) => {
        const readStream = createReadStream(inputFile);
        readStream.on("open", () => {
          readStream.pipe(sharpPipeEntry);
        });
        readStream.on("error", (err) => {
          logger.error("Error while reading input stream:");
          logger.fatal(err);
          return reject("foo");
        });

        Promise.all(sharpPipes)
          .then(() => {
            logger.debug("Processed all pipes...");
            return resolve();
          })
          .catch((err) => {
            logger.error("Error while processing the pipes...");
            logger.fatal(err);
            return reject("foo");
          });
      })
      .catch(() => {
        return reject();
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

    parseConfig(config as ImageProcessorConfig)
      .then((parsedConfig) => {
        const targetConfig = parsedConfig[0];

        sharpWrapper(
          options.inputFile.toString(),
          options.outputDir.toString(),
          targetConfig
        )
          .then(() => {
            logger.info("Successfully processed image!");
            process.exit(EXIT_SUCCESS);
          })
          .catch(() => {
            logger.error("Error while processing the image!");
            process.exit(EXIT_IMAGE_PROCESSOR_FAILURE);
          });
      })
      .catch((err) => {
        logger.error("Could not parse configuration file!");
        logger.error(err);
        process.exit(EXIT_IMAGE_PROCESSOR_FAILURE);
      });
  }
}

main();
