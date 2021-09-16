/* NodeJS modules */
import crypto = require("crypto");
import fs = require("fs");
import path = require("path");
import stdio = require("stdio");
import util = require("util");

// TODO: Check "require("fs").promises, could possibly shorten the code here!
const fscopyfile = util.promisify(fs.copyFile);
const fsreaddir = util.promisify(fs.readdir);
const fsrename = util.promisify(fs.rename);
const fsstat = util.promisify(fs.stat);

/* project files */
import {
  BustedManifestFilterByExtensionMismatch,
  BustedManifestFileSystemError,
  BustedManifestHashError,
  BustedManifestHashWalkerError,
} from "../errors";

const modeCopy = "copy";
const modeRename = "rename";
const EXIT_SUCCESS = 0;
const EXIT_CONFIG_FAILURE = 3;
const EXIT_HASHWALKER_FAILURE = 4;

interface resultDict {
  [index: string]: string;
}

function copyFile(source: string, destination: string): Promise<string> {
  /* Copy the source file to destination file name.
   * In the context of this script, the source file will be copied to a new
   * filename, as provided by determineNewFilname.
   *
   * @param source: string : the source file, provided as string
   * @oaram destination: string : the destination, provided as string
   * @return Promise
   *   - success: the new filename, provided as string
   *   - fail: an internal error object
   */

  return new Promise((resolve, reject) => {
    fscopyfile(source, destination)
      .then(() => resolve(destination))
      .catch(() =>
        reject(new BustedManifestFileSystemError("Could not copy file!"))
      );
  });
}

function renameFile(source: string, destination: string): Promise<string> {
  /* Rename the source file to destination file name.
   * In the context of this script, the source file will be renamed to a new
   * filename, as provided by determineNewFilename.
   *
   * @param source: string : the source file, provided as string
   * @param destination: string : the destination, provided as string
   * @return Promise
   *   - success: the new filename, provided as string
   *   - fail: an internal error object
   */

  return new Promise((resolve, reject) => {
    fsrename(source, destination)
      .then(() => resolve(destination))
      .catch(() =>
        reject(new BustedManifestFileSystemError("Could not rename file!"))
      );
  });
}

function createHashedFile(
  source: string,
  destination: string,
  mode: string
): Promise<string> {
  /* Create the file with the file's content hashed included in its name.
   *
   * This function determines, if the new file will be created by copying or
   * renaming.
   *
   * @param source: string : the source file, provided as string
   * @param destination: string : the destination, provided as string
   * @param mode: string : determines copy or rename mode
   * @return Promise
   *   - success: the new filename, provided as string
   *   - fail: an internal error object, as raised by the actual file operation
   *           function (renameFile or copyFile)
   */

  return new Promise((resolve, reject) => {
    let fileFunc;
    switch (mode) {
      case modeCopy:
        fileFunc = copyFile;
        break;
      case modeRename:
        fileFunc = renameFile;
        break;
      default:
        return reject(new BustedManifestHashWalkerError("Unknown mode"));
    }

    fileFunc(source, destination)
      .then(() => resolve(destination))
      .catch((err) => reject(err));
  });
}

function determineNewFilename(
  file: string,
  fileHash: string,
  hashLength: number
): Promise<string> {
  /* Determines the new filename by including the file's hash.
   *
   * @param file: string : the file, provided as string
   * @param fileHash: string : the hash of the file's content
   * @param hashLength: number : just use a part of the hash
   * @return Promise
   *   - success: the new filename
   */

  return new Promise((resolve, _reject) => {
    const filePath = path.dirname(file);
    const fileExt = path.extname(file);
    const fileBasename = path.basename(file, fileExt);

    const newFilename = path.join(
      filePath,
      fileBasename + "." + fileHash.substring(0, hashLength) + fileExt
    );

    return resolve(newFilename);
  });
}

function filterByExtension(
  file: string,
  extensions: string[]
): Promise<string> {
  /* Matches a given file against a list of extensions.
   *
   * @param file: string : Reference to a file, given as string
   * @param extensions: string[] : A list of file extensions, provided as
   *                               strings
   * @return Promise
   *   - success: The file reference, given as string
   *   - fail: a specific error object
   */

  return new Promise((resolve, reject) => {
    /* get the file extension */
    const fileExt = path.extname(file).substring(1);

    /* if the file matches the extensions, resolve with the "file" for further
     * processing.
     */
    if (extensions.includes(fileExt)) return resolve(file);

    /* if the file does not match the extension list, reject with an error */
    return reject(
      new BustedManifestFilterByExtensionMismatch("Extension does not match!")
    );
  });
}

function hashFileContent(file: string): Promise<string> {
  /* Calculate the hash of a file's content.
   *
   * @param file: string : Reference to a file, given as string
   *
   * @return Promise
   *   - success: The hash of the file's content
   *   - fail: a specific error object
   */

  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("md5");
    const stream = fs.createReadStream(file);

    stream.on("error", () =>
      reject(new BustedManifestHashError("Error during hash calculation"))
    );
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("data", (chunk) => hash.update(chunk));
  });
}

function hashWalker(
  dir: string,
  extensions: string[],
  hashLength: number,
  operationMode: string,
  commonPathLength = -1
): Promise<resultDict> {
  /* Recursively iterates a given directory and hashes files matching the
   * extensions list.
   *
   * @param dir: string : A path given as string.
   * @param extensions: string[] : A list of file extensions, provided as
   *                               strings
   * @return Promise
   *   - success: a list with tupels of filenames and generated filenames that
   *              include a hash of the file's content
   *   - fail: the respective error object
   */

  let results: resultDict = {};

  /* the first iteration of hashWalker will determine the common path length
   * and pass it on.
   * While hashWalker operates on absolute file paths, the resulting list of
   * tuples should provide relative paths again.
   */
  if (commonPathLength === -1)
    commonPathLength = path.resolve(dir).length - dir.length;

  return new Promise((resolve, reject) => {
    fsreaddir(dir)
      .then((list) => {
        /* Check if there are still things to do. If nothing is pending, resolve
         * with the overall results.
         */
        let pending = list.length;
        if (!pending) return resolve(results);

        /* at this point, there are still items to be iterated in list */
        list.forEach((file) => {
          /* Make the file path absolute */
          file = path.resolve(dir, file);

          fsstat(file)
            .then((stat) => {
              if (stat.isDirectory()) {
                /* handle sub-directories with recursive call */
                hashWalker(
                  file,
                  extensions,
                  hashLength,
                  operationMode,
                  commonPathLength
                ).then(
                  /* recursive call succeeded, merge the results */
                  (result) => {
                    results = Object.assign({}, results, result);
                    if (!--pending) return resolve(results);
                  },
                  /* the recursive call failed, just pass the original error upwards */
                  (err) => reject(err)
                );
              } else {
                /* handle files:
                 *   - match against the provided list of extensions
                 *   - actually hash the file's content
                 *   - rename / copy the file
                 *   - create record for the manifest file
                 */
                filterByExtension(file, extensions)
                  .then(hashFileContent)
                  .then((hash) => {
                    return determineNewFilename(file, hash, hashLength);
                  })
                  .then((newFilename) => {
                    return createHashedFile(file, newFilename, operationMode);
                  })
                  .then((newFilename) => {
                    results[file.substring(commonPathLength)] =
                      newFilename.substring(commonPathLength);
                  })
                  .catch((err) => {
                    if (
                      !(err instanceof BustedManifestFilterByExtensionMismatch)
                    )
                      return reject(err);
                  })
                  .finally(() => {
                    if (!--pending) return resolve(results);
                  });
              }
            })
            .catch(() =>
              reject(
                new BustedManifestFileSystemError(
                  "Error while accessing file stat"
                )
              )
            );
        });
      })
      .catch(() =>
        reject(
          new BustedManifestFileSystemError("Error while reading directory")
        )
      );
  });
}

function mergeIncrementalResults(
  /* Merge results in incremental operation mode.
   *
   * @param existing_result: resultDict : The existing results as parsed from
   *                                      the JSON file
   * @param new_result: resultDict : The results of this run
   *
   * @return resultDict : the merged dictionary
   */
  existing_result: resultDict,
  new_result: resultDict
): resultDict {
  for (const key in new_result) {
    existing_result[key] = new_result[key];
  }

  return existing_result;
}

function main(): void {
  /* setup of the command line options */
  const options = stdio.getopt({
    rootDirectory: {
      description: "The root directory to look for files",
      required: true,
      args: 1,
    },
    outFile: {
      description: "Name of the output file, including its extension.",
      required: false,
      args: 1,
      default: "asset-manifest.json",
    },
    extensions: {
      key: "e",
      description: "A file extension to be processed, without leading dot.",
      required: false,
      args: "*",
      multiple: true,
      default: ["css", "js"],
    },
    mode: {
      key: "m",
      description:
        "The operation mode. Files can be renamed or copied. Accepted values: " +
        modeCopy +
        "|" +
        modeRename,
      required: false,
      args: 1,
      default: "copy",
    },
    incremental: {
      key: "i",
      description: "Incrementally builds the manifest file.",
      required: false,
      default: false,
    },
    hashLength: {
      description: "The length of the hash string to be appended",
      required: false,
      args: 1,
      default: "10",
    },
  });

  /* parse the options */
  const config = {
    rootDirectory: "",
    outFile: "asset-manifest.json",
    hashLength: 0,
    mode: "",
    incremental: false,
    extensions: ["css", "js"],
  };

  if (options !== null) {
    /* the length of the hash is simply converted to a number */
    config.hashLength = parseInt(options.hashLength.toString());

    /* is incremental mode activated? */
    if (typeof options.incremental === "boolean") {
      config.incremental = options.incremental;
    } else {
      config.incremental = false;
    }

    /* Parsing the extension list
     * If multiple extensions are provided, they will be pushed to config one
     * by one. If only a single extension is given, it will be pushed to an
     * array aswell, as hashWalker expects a list of extensions.
     */
    if (Array.isArray(options.extensions)) {
      config.extensions = [];
      options.extensions.forEach((item) => {
        config.extensions.push(item.toString());
      });
    } else if (typeof options.extensions === "string") {
      config.extensions = [options.extensions];
    } else {
      console.error("Could not parse extensions.");
      process.exit(EXIT_CONFIG_FAILURE);
    }

    /* just check, if mode is set to one of the accepted values */
    if (options.mode === modeCopy || options.mode === modeRename)
      config.mode = options.mode;
    else {
      console.error("Could not determine operation mode.");
      console.error(
        'Make sure to use either "' + modeCopy + '" or "' + modeRename + '"'
      );
      process.exit(EXIT_CONFIG_FAILURE);
    }

    /* The rootDir, as the starting point of hashWalker.
     * Just checking, if the path is actually readable/writeable.
     */
    const checkRootDir = path.normalize(
      path.resolve(options.rootDirectory.toString())
    );
    try {
      fs.accessSync(checkRootDir, fs.constants.R_OK | fs.constants.W_OK);
      config.rootDirectory = options.rootDirectory.toString();
    } catch (err) {
      console.error(
        "The specified rootDirectory could not be read/written to."
      );
      console.error("Resolved the directory to:", checkRootDir);
      process.exit(EXIT_CONFIG_FAILURE);
    }

    /* The outFile has to be readable and writeable */
    let checkOutFile = options.outFile.toString();
    if (checkOutFile === path.basename(checkOutFile))
      checkOutFile = path.normalize(
        path.resolve(path.join(config.rootDirectory, checkOutFile))
      );
    else checkOutFile = path.normalize(path.resolve(checkOutFile));

    try {
      fs.accessSync(
        path.dirname(checkOutFile),
        fs.constants.R_OK | fs.constants.W_OK
      );
      config.outFile = checkOutFile;
    } catch (err) {
      console.error("The specified outFile could not be read/written to.");
      console.error("Resolved outFile to:", checkOutFile);
      process.exit(EXIT_CONFIG_FAILURE);
    }
  }

  /* actually run the hashWalker */
  hashWalker(
    config.rootDirectory,
    config.extensions,
    config.hashLength,
    config.mode
  ).then(
    (result) => {
      let final_result: resultDict = result;
      if (config.incremental) {
        const buffer = fs.readFileSync(config.outFile, "utf-8");

        // Disable linting for the next line. The linter knows, that
        // "existing_result" has to be a "resultDict", but JSON.parse() returns
        // "any".
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const existing_result = JSON.parse(buffer.toString());

        final_result = mergeIncrementalResults(existing_result, result);
      }
      fs.writeFileSync(config.outFile, JSON.stringify(final_result));
      process.exit(EXIT_SUCCESS);
    },
    (err) => {
      console.error("hashWalker returned with an error:");
      console.error(err);
      process.exit(EXIT_HASHWALKER_FAILURE);
    }
  );
}

main();
