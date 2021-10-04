/* NodeJS modules */
// import fs = require("fs");
import http = require("http");
import path = require("path");
import fs = require("fs");

/* project files */
import { DevBMSServerError, DevBMSRessourceNotFoundError } from "../errors";

/* This dictionary is used for look ups of MIME types, based on the requested
 * source filetype.
 */
const mimeTypes: { [id: string]: string } = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".jpeg": "image/jpg",
  ".gif": "image/gif",
};

function getUriFromRequest(request: http.IncomingMessage): Promise<string> {
  /* Return the URI from the request */
  return new Promise((resolve, _reject) => {
    const url = request.url ? request.url : "/";

    return resolve(url);
  });
}

function determineRessourceFromUri(
  uri: string,
  webRoot: string
): Promise<string> {
  /* Map the requested URI to an actual ressource on the filesystem.
   *
   * The existence of the ressource is verified using lstatSync. If the
   * ressource is a directory, (which might be the usual case, depending on
   * the structure of the project's permalinks), "index.html" is automatically
   * appended to determine the actual HTML source file.
   */
  return new Promise((resolve, reject) => {
    const ressource = path.join(webRoot, uri);
    // console.log("[debug] assumed ressource: ", ressource);

    try {
      if (fs.lstatSync(ressource).isDirectory() === true) {
        return resolve(
          determineRessourceFromUri(path.join(uri, "index.html"), webRoot)
        );
      } else {
        return resolve(ressource);
      }
    } catch {
      return reject(
        new DevBMSRessourceNotFoundError("Ressource not found!", ressource)
      );
    }
  });
}

export function launchHttpServer(
  webRoot: string,
  host: string,
  port: number
): Promise<void> {
  /* Handle the complete HTTP request/response cycle.
   *
   * After determining the requested ressource, the corresponding file is opened
   * using "fs.createReadStream()", and its data is directly streamed to the
   * response. This implementation ensures the functionality for (very) big
   * files.
   *
   * Basically this server only provides 200/404 responses.
   *
   * DO NOT USE THIS IN A PRODUCTION ENVIRONMENT!
   */
  return new Promise((resolve, reject) => {
    try {
      http
        .createServer(
          (request: http.IncomingMessage, response: http.ServerResponse) => {
            getUriFromRequest(request)
              .then((uri) => {
                return determineRessourceFromUri(uri, webRoot);
              })
              .then((ressource) => {
                const mime =
                  mimeTypes[path.extname(ressource)] ||
                  "application/octet-stream";

                const fileStream = fs.createReadStream(ressource);

                fileStream.on("start", () => {
                  response.writeHead(200, { "Content-Type": mime });
                });
                fileStream.on("data", (chunk: any) => {
                  response.write(chunk);
                });
                fileStream.on("end", () => {
                  response.end();
                  console.log(
                    '[dev-bms:http-server] 200 OK "' + ressource + '"'
                  );
                });
                fileStream.on("error", () => {
                  return reject(new DevBMSServerError("foo"));
                });
              })
              .catch((err) => {
                if (err instanceof DevBMSRessourceNotFoundError) {
                  console.log(
                    '[dev-bms:http-server] 404 Not Found "' +
                      err.ressource +
                      '"'
                  );
                  response.writeHead(404, { "Content-Type": "text/plain" });
                  response.write("Not Found!\n");
                  response.end();
                } else {
                  console.log(err);
                  try {
                    response.writeHead(500, { "Content-Type": "text/plain" });
                    response.write("Server Error\n");
                    response.end();
                  } catch (fail) {
                    console.log(fail);
                  }
                }
              });
          }
        )
        .listen(port, host, () => {
          console.log(
            "[dev-bms:http-server] Launched server on " +
              host +
              ":" +
              port.toString() +
              "..."
          );
        });

      return resolve();
    } catch {
      return reject(new DevBMSServerError("Could not launch http server!"));
    }
  });
}
