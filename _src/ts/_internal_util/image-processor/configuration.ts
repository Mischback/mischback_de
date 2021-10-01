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
  return new Promise((resolve, _reject) => {
    const targetConfig = config.targets ;

    return resolve([targetConfig]);
  });
}
