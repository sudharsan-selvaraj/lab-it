require("dotenv").config();
import * as os from "os";
import path from "path";
import yargs from "yargs/yargs";

const DEFAULT_APPUIUM_PORT = 4723;
const PROJECT_ROOT = path.resolve(__dirname, "..");

const parsedArgs = yargs(process.argv.slice(2))
  .options({
    port: {
      alias: "p",
      description: "Port to start the appium server",
      demandOption: false,
      default: DEFAULT_APPUIUM_PORT,
    },
    "plugin-appium-node-hub-host": {
      description: "host address of the appium hub",
      demandOption: true,
    },
    "plugin-appium-node-hub-port": {
      description: "host port of the appium hub",
    },
    "plugin-appium-node-host": {
      description: "Host name or ip address of the node",
      default: undefined,
    },
    "plugin-appium-node-name": {
      description: "Name of the node to distinguish it from the rest of the nodes in hub",
    },
    "plugin-appium-node-token": {
      description: "Api token to authenticate node when connecting to grid",
      demandOption: true,
    },
    "plugin-appium-node-adb-port": {
      description: "Port to connect to running adb server",
    },
    "base-path": {
      alias: "pa",
      description: "Base path to use as the prefix for all webdriver routes running on the server",
      default: "/",
    },
  })
  .parseSync();

export interface Configuration {
  projectRoot: string;
  appiumPort: number;
  hostname: string;
  wdBasePath: string;
  hubHost: string;
  hubPort: number;
  nodeHost?: string;
  apiKey: string;
  adbPort: number;
}

export default {
  projectRoot: PROJECT_ROOT,
  appiumPort: process.env.APPIUM_PORT || parsedArgs.port,
  hostname: os.hostname(),
  wdBasePath: parsedArgs["base-path"],
  hubHost: parsedArgs["plugin-appium-node-hub-host"],
  hubPort: parsedArgs["plugin-appium-node-hub-port"],
  nodeHost: parsedArgs["plugin-appium-node-host"],
  nodeName: parsedArgs["plugin-appium-node-name"],
  apiKey: parsedArgs["plugin-appium-node-token"],
  adbPort: parsedArgs["plugin-appium-node-adb-port"],
} as Configuration;
