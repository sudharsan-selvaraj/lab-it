import { exec, SubProcess } from "teen_process";
import path from "path";
import fs from "fs";
import _ from "lodash";
import { isMac, isWindows } from "../common";
import { getLogger } from "appium-grid-logger";
import { GoIosTracker } from "./tracker";
import { Service } from "typedi";
import { GoIosClient } from "./client";

const log = getLogger("go-ios-client");

export class GoIos {
  public async getClient() {
    try {
      let { stdout: binPath } = await exec("npm", ["bin", "-g"]);
      if (!binPath || binPath.length == 0) {
        binPath = path.join(process.env.npm_config_prefix as string, "bin");
      }
      if (!_.isNil(binPath) && binPath != "") {
        const goIosPath = path.join(binPath.trim(), "ios" + (isWindows() ? ".exe" : ""));
        const goIosInstalled = fs.existsSync(goIosPath) && fs.lstatSync(goIosPath).isFile();
        if (goIosInstalled) {
          return new GoIosClient(goIosPath);
        } else {
          throw new Error("GoIos not installed");
        }
      } else {
        throw new Error("GoIos not installed");
      }
    } catch (err) {
      log.error("Unable to initialize go-ios client");
      log.error(err);
      throw err;
    }
  }
}
