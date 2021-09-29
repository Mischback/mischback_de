import { getopt } from "stdio";

function main(): void {
  const options = getopt({
    configFile: {
      description: "path/filename of the config file",
      required: false,
      args: 1,
      default: "image-processor.json",
    },
  });

  if (options !== null) {
    console.log("Config: " + options.configFile.toString());
  }
}

main();
