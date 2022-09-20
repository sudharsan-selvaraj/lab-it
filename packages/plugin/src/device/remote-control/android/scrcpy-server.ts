import path from "path";
import { AndroidDevice } from "./android-device";
import { ARGS_STRING as scrcpyArgs, SERVER_PACKAGE, SERVER_PORT, SERVER_PROCESS_NAME } from "./scrcpy-config";
import asyncWait from "async-wait-until";
import { asyncForEach } from "appium-grid-common";
import { getLogger } from "appium-grid-logger";
import { Inject, Service } from "typedi";
import { Dependencies } from "../../../contants";
import { Configuration } from "../../../config";
import { getFreePort } from "../../../utils/common";

const SCRCPY_JAR = "scrcpy-server";
const TEMP_PATH = "/data/local/tmp/";
const PID_FILE_PATH = `${TEMP_PATH}ws_scrcpy.pid`;
const SERVER_COMMAND = `CLASSPATH=${TEMP_PATH}${SCRCPY_JAR} nohup ${SERVER_PROCESS_NAME} ${scrcpyArgs}`;

const log = getLogger("ScrcpyServer");

@Service()
export class ScrcpyServer {
  private libsDirectory!: string;
  private serverStarted: boolean = false;
  private localPort!: number;

  constructor(@Inject(Dependencies.CONFIGURATION) private config: Configuration, private device: AndroidDevice) {
    this.libsDirectory = path.join(config.projectRoot, "libs");
  }

  private async copyServer() {
    const scrcpyServerPath = path.join(this.libsDirectory, SCRCPY_JAR);
    const destination = TEMP_PATH + SCRCPY_JAR;
    await this.device.pushFile(scrcpyServerPath, destination);
    log.info(`Pushing scrcy server jar to device ${this.device.getId()}`);
  }

  private async getServerPids() {
    const pidList = await this.device.getPidOfProcess(SERVER_PROCESS_NAME);
    const pids: number[] = [];
    await asyncForEach(pidList || [], async (pid) => {
      const processName = await this.device.execShellCommand(["cat", `/proc/${pid}/cmdline`]);
      if (processName.toLowerCase().indexOf(SERVER_PACKAGE.toLowerCase()) >= 0) {
        pids.push(pid);
      }
    });
    return pids;
  }

  private async killServer() {
    const pidList = await this.getServerPids();
    if (pidList && pidList.length) {
      log.info(`Killing existing streaming service`);
      await Promise.all(pidList.map((pid) => this.device.execShellCommand(["kill", `${pid}`])));
    }
  }

  private async waitForServerToStart() {
    log.info(`Waiting for scrcpy server to start ${this.device.getId()}`);
    this.serverStarted = false;
    try {
      await asyncWait(
        async () => {
          return (await this.getServerPids()).length > 0;
        },
        {
          timeout: 60 * 1000,
          intervalBetweenAttempts: 1000,
        }
      );
      this.serverStarted = true;
    } catch (err) {
      this.serverStarted = false;
      console.log(err);
    }
  }

  private startServer() {
    return this.device
      .execLongProcessCommand([SERVER_COMMAND])
      .then(() => {
        if (this.serverStarted) {
          log.error("Scrcpy sever disconnected");
        }
      })
      .catch((err) => {
        log.error("Error running Scrcpy sever..");
        log.error(err);
      });
  }

  public async run() {
    const serverPids = await this.getServerPids();
    if (serverPids.length > 0) {
      await this.killServer();
    }
    try {
      await this.copyServer();
      await Promise.race([this.startServer(), this.waitForServerToStart()]);
      this.localPort = await getFreePort();
      log.info(`Scrcpy server started on device ${this.device.getId()} in port ${this.localPort}`);
      this.device.forwardPort(`tcp:${this.localPort}`, `tcp:${SERVER_PORT}`);
      return true;
    } catch (err) {
      if (this.serverStarted) {
        log.info(`Stopping srccpy server`);
        this.serverStarted = false;
      } else {
        log.info(`Unable to start Scrcpy server on device ${this.device.getId()}`);
        log.error(err);
      }
      return false;
    }
  }

  public getPort(): number {
    return this.localPort;
  }
}
