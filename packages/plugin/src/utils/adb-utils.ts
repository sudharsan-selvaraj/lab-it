import ADB from "appium-adb";
import _ from "lodash";
import asyncWait from "async-wait-until";
import { spawn } from "child_process";
import { getLogger } from "appium-grid-logger";
import { AbortSignal } from "node-abort-controller";

const log = getLogger("AdbUtils");

export class AdbUtils {
  constructor(private adb: ADB) {}

  async getDeviceProperty(udid: string, propertyName?: string) {
    const args = ["-s", udid, "shell", "getprop"];
    if (propertyName) {
      args.push(propertyName);
    }
    return this.adb.adbExec(args);
  }

  async getDeviceProps(udid: string): Promise<Record<string, string>> {
    const props = (await this.getDeviceProperty(udid)) as any;
    return props.split("\n").reduce((propsObject: Record<string, string>, prop: string) => {
      const [name, value] = prop.split(":");
      if (!name || !value) {
        return propsObject;
      }
      const parsed = {
        name: name.trim().replace(/\[|\]/g, ""),
        value: value.trim().replace(/\[|\]/g, ""),
      };
      propsObject[parsed.name] = parsed.value;
      return propsObject;
    }, {});
  }

  async waitBootComplete(udid: string, signal: AbortSignal) {
    return await asyncWait(
      async () => {
        try {
          if (signal.aborted) {
            throw new Error("Request to abort adb lookup");
          }
          const bootStatus = (await this.getDeviceProperty(udid, "init.svc.bootanim")) as any;
          if (!_.isNil(bootStatus) && !_.isEmpty(bootStatus) && bootStatus == "stopped") {
            return true;
          }
        } catch (err) {
          return false;
        }
      },
      {
        intervalBetweenAttempts: 2000,
        timeout: 60 * 1000,
      }
    );
  }

  async getTotalMemory(deviceId: string) {
    const args = ["-s", deviceId, "shell", "cat", "/proc/meminfo"];

    const res = (await this.adb.adbExec(args)) as any;
    let match = res.match(/MemTotal:.*[0-9]/g);
    if (match && match.length) {
      return match[0].replace(/[^0-9]/g, "");
    }
    return 0;
  }

  async getTotalCpu(deviceId: string) {
    const args = ["-s", deviceId, "shell", "cat", "/proc/cpuinfo"];

    const res = (await this.adb.adbExec(args)) as any;
    return res.match(/processor/g)?.length;
  }

  public async runLongShellCommand(deviceUdid: string, command: any[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const cmd = this.adb.executable.path;
      const args = ["-s", `${deviceUdid}`, "shell", ...command];
      const adb = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
      let output = "";

      adb.stdout.on("data", (data) => {
        output += data.toString();
        log.info(data.toString().replace(/\n$/, ""));
      });

      adb.stderr.on("data", (data) => {
        log.error(data);
      });

      adb.on("error", (err: Error) => {
        log.error(`Failed to run "${args.join(" ")}"`);
        log.error(err);
        reject(err);
      });

      adb.on("close", (code) => {
        log.info(`adb process (${args.join(" ")}) exited with code ${code}`);
        resolve(output);
      });
    });
  }
}
