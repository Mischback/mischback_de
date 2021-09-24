/* NodeJS modules */
// import fs = require("fs");
import http = require("http");
import path = require("path");
import fs = require("fs");

/* project files */
import { DevBMSServerError, DevBMSRessourceNotFoundError } from "../errors";

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
  return new Promise((resolve, _reject) => {
    const url = request.url ? request.url : "/";
    // console.log("[debug] requested url: ", url);
    return resolve(url);
  });
}

function determineRessourceFromUri(
  uri: string,
  webRoot: string
): Promise<string> {
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
        new DevBMSRessourceNotFoundError(
          "Could not determine ressource:" + ressource
        )
      );
    }
  });
}

export function launchHttpServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const port = 8000;
      const host = "0.0.0.0";
      const webRoot = "_site";

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
                });
                fileStream.on("error", () => {
                  return reject(new DevBMSServerError("foo"));
                });
              })
              .catch((err) => {
                if (err instanceof DevBMSRessourceNotFoundError)
                  /* TODO: Continue here and provide 404 */
                  console.log("Requested ressource not found!");

                console.log(err);
              });
          }
        )
        .listen(port, host);

      return resolve();
    } catch {
      return reject(new DevBMSServerError("Could not launch http server!"));
    }
  });
}
