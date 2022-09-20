import _ from "lodash";
import { IAppInstallationReciever } from "src/types";
import { EventEmitter } from "stream";
import { SubProcess } from "teen_process";
import { AndroidDevice } from "./android-device";
import os from "os";
import path from "path";
import { v4 as udid } from "uuid";
import fs from "fs";

const ApkReader = require("adbkit-apkreader");

export class AndroidApkInstaller extends EventEmitter {
  private isInstallationInProgress = false;
  private installationProc!: SubProcess;

  private forceStop = false;
  constructor(private device: AndroidDevice) {
    super();
  }

  public async install(app: any, requestId: string, listener: IAppInstallationReciever) {
    const appPath = path.join(os.tmpdir(), udid() + ".apk");
    fs.writeFileSync(appPath, Buffer.from(app));
    const reader = await ApkReader.open(appPath);
    const manifest = await reader.readManifest();
    const packageName = manifest.package;

    if (this.isInstallationInProgress) {
      return;
    }
    listener.onInstallationStarted({
      deviceId: this.device.getId(),
      requestId: requestId,
    });
    this.isInstallationInProgress = true;
    const adb = this.device.getAdb();
    this.installationProc = new SubProcess(adb.executable.path, [
      "-s",
      this.device.getId(),
      "install",
      "-r",
      "-d",
      appPath,
    ]);

    this.installationProc.on("stream-line", (line: string) => {
      listener.onInstallationLog({
        log: line,
        deviceId: this.device.getId(),
        requestId: requestId,
      });
    });
    this.installationProc.on("exit", async (code, signal) => {
      this.isInstallationInProgress = false;
      if (this.forceStop) {
        this.forceStop = false;
        return;
      }
      //const isAppInstalled = await adb.isAppInstalled(packageName);
      listener.onAppInstallationComplete({
        success: true,
        deviceId: this.device.getId(),
        requestId: requestId,
      });
    });
    this.installationProc.start(0);
  }

  public stop() {
    if (!_.isNil(this.installationProc)) {
      this.forceStop = true;
      this.installationProc.stop(0);
    }
  }
}
