/* NodeJS modules */
// import fs = require("fs");
import http = require("http");
import path = require("path");
import fs = require("fs");

/* project files */
import { DevBMSServerError, DevBMSRessourceNotFoundError } from "../errors";

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

      http
        .createServer(
          (request: http.IncomingMessage, response: http.ServerResponse) => {
            getUriFromRequest(request)
              .then((uri) => {
                return determineRessourceFromUri(uri, "_site");
              })
              .then((ressource) => {
                console.log("[debug] determined this ressource: ", ressource);
              })
              .catch((err) => {
                if (err instanceof DevBMSRessourceNotFoundError)
                  console.log("Requested ressource not found!");

                console.log(err);
              });

            response.end("Hello World");
          }
        )
        .listen(port, host);

      return resolve();
    } catch {
      return reject(new DevBMSServerError("Could not launch http server!"));
    }
  });
}
