export type targetFormats =
  | "avif"
  | "gif"
  | "heif"
  | "jpeg"
  | "png"
  | "raw"
  | "svg"
  | "tiff"
  | "webp";
type targetModes = "do-not-scale" | "keep-aspect";

interface targetItem {
  mode: targetModes;
  filenameSuffix: string;
  formats: targetFormats[];
}

interface targetItem {
  mode: targetModes;
  filenameSuffix: string;
  formats: targetFormats[];
  width: number;
}

interface targetItem {
  mode: targetModes;
  filenameSuffix: string;
  formats: targetFormats[];
  height: number;
}

export interface targetConfig {
  [key: string]: targetItem;
}

export interface ImageProcessorConfig {
  targets: targetConfig;
}

export function parseConfig(
  config: ImageProcessorConfig
): Promise<[targetConfig]> {
  return new Promise((resolve, reject) => {
    const targetConfig = config.targets;

    if (targetConfig === undefined)
      return reject("Could not extract target configuration from config file!");

    return resolve([targetConfig]);
  });
}
