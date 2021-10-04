import sharp = require("sharp");

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

export interface formatConfig {
  [key: string]:
    | sharp.OutputOptions
    | sharp.JpegOptions
    | sharp.PngOptions
    | sharp.WebpOptions
    | sharp.AvifOptions
    | sharp.HeifOptions
    | sharp.GifOptions
    | sharp.TiffOptions;
}

export interface ImageProcessorConfig {
  targets: targetConfig;
  formatOptions: formatConfig;
}

export function parseConfig(
  config: ImageProcessorConfig
): Promise<[targetConfig, formatConfig]> {
  return new Promise((resolve, reject) => {
    const targetConfig = config.targets;
    const formatConfig = config.formatOptions;

    if (targetConfig === undefined)
      return reject("Could not extract target configuration from config file!");

    if (formatConfig === undefined)
      return reject("Could not extract format configuration from config file!");

    return resolve([targetConfig, formatConfig]);
  });
}
