import AdbKit, { Client as AdbClient, DeviceClient } from "@devicefarmer/adbkit";
import ADB from "appium-adb";
import { Device } from "appium-grid-common";
import _ from "lodash";
import { AdbUtils } from "../../../utils/adb-utils";

export class AndroidDevice {
  private deviceClient!: DeviceClient;
  private adbKit: AdbClient;
  private adbUtils: AdbUtils;

  constructor(private device: Device, private adb: ADB) {
    this.adbKit = AdbKit.createClient({
      port: this.adb.getAdbServerPort(),
    });
    this.adbUtils = new AdbUtils(adb);
  }

  public getId() {
    return this.device.getUdid();
  }

  public getAdb() {
    return this.adb;
  }

  public async pushFile(fileToPush: string, destination: string) {
    const client = await this.getDeviceClient();
    await client.push(fileToPush, destination);
  }

  public async forwardPort(localPort: string, devicePort: string) {
    const client = await this.getDeviceClient();
    await client.forward(localPort, devicePort);
  }

  private async getDeviceClient() {
    if (_.isNil(this.deviceClient)) {
      this.deviceClient = await this.adbKit.getDevice(this.device.getUdid());
    }
    return this.deviceClient;
  }

  public async execLongProcessCommand(args: any[]) {
    return this.adbUtils.runLongShellCommand(this.device.getUdid(), args);
  }

  public async execShellCommand(args: string[], timeout?: number) {
    return (await this.exec(["shell", ...args], timeout)) as any;
  }

  public async exec(args: string[], timeout?: number) {
    return (await this.adb.adbExec(["-s", this.device.getUdid(), ...args], {
      timeout: timeout,
    })) as any;
  }

  public async getPidOfProcess(processName: string): Promise<Array<string>> {
    try {
      const response = await this.execShellCommand(["pidof", processName]);
      return response.split(" ");
    } catch (err) {
      return [];
    }
  }
}
