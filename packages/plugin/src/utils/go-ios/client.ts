import { GoIosTracker } from "./tracker";
import { exec as procExec, SubProcess } from "teen_process";

export class GoIosClient {
  constructor(private iosPath: string) {}

  public startWda(deviceUdid: string, wdaBundleId: string): SubProcess {
    const args = [
      "runwda",
      "--udid",
      deviceUdid,
      "--bundleid",
      wdaBundleId,
      "--testrunnerbundleid",
      wdaBundleId,
      "--xctestconfig",
      "WebDriverAgentRunner.xctest",
    ];

    const wdaProc = new SubProcess(this.iosPath, args);
    wdaProc.start(0);
    return wdaProc;
  }

  public getTracker() {
    return new GoIosTracker(this.iosPath);
  }

  public async getWdaBundleId(deviceUdid: string) {
    try {
      const installedApps = await this.getAllApps(deviceUdid);
      const apps = installedApps.filter(
        (app: any) => app["CFBundleIdentifier"]?.toLowerCase().indexOf("webdriveragentrunner.xctrunner") >= 0
      );
      return apps.length > 0 ? (apps as any)[0]["CFBundleIdentifier"] : null;
    } catch (err) {
      return null;
    }
  }

  public async getAllApps(deviceUdid: string) {
    return await this.exec(["--udid", deviceUdid, "apps"]);
  }

  public async exec(args: string[]) {
    const { stdout, stderr } = await procExec(this.iosPath, args);
    if (stderr) {
      throw stderr;
    }
    try {
      return JSON.parse(stdout);
    } catch (err) {
      return stdout;
    }
  }
}
