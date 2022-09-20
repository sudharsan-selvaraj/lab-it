import { Device, DeviceDisplayInfo, DeviceType, WebdriverCapability } from "appium-grid-common";
import { REMOTE_CONTROL_DEVICE_TOKEN } from "../../../di/tokens";
import Container, { Inject, Service } from "typedi";
import {
  IAppInstallationReciever,
  IDeviceLogReciever,
  IDeviceShellDataReciever,
  IRemoteDeviceController,
  IStreamReciever,
} from "../../../types";
import { IosUtils } from "../../../utils/ios-utils";
import { isMac } from "../../../utils/common";
import { ExecuteLock } from "appium-grid-common";
import { MjpegDecoder } from "./mjpeg-decoder";
import { getLogger } from "appium-grid-logger";

import _ from "lodash";
import { RemoteControlHandler } from "../remote-control-handler";
import { WdaProxy } from "./wda-proxy";
import { IosActionController } from "./action-controller";
import { GoIosClient } from "../../../utils/go-ios/client";

const log = getLogger("IosDeviceRemoteControl");

const lock = new ExecuteLock("IOSRemoteControlLock");
@Service()
export class IosRemoteControl extends RemoteControlHandler {
  private realDevice: boolean;
  private streamDecoder!: MjpegDecoder | null;
  private actionController!: IosActionController;
  private streamStarted: boolean = false;
  private controlStarted: boolean = false;

  private screenInfo!: DeviceDisplayInfo;
  private wdaProxy: WdaProxy;
  private goIosClient!: GoIosClient;

  private streamListener: Map<string, IStreamReciever> = new Map();
  private logListener: Map<string, IDeviceLogReciever> = new Map();

  constructor(@Inject(REMOTE_CONTROL_DEVICE_TOKEN) private device: Device) {
    super();
    this.realDevice = device.getType() == DeviceType.REAL;
    this.wdaProxy = new WdaProxy(this.device);
    this.actionController = new IosActionController(this.wdaProxy);
    this.goIosClient = Container.get(GoIosClient);
  }

  async startLogs(): Promise<boolean> {
    return false;
  }

  async stopLogs(): Promise<void> {}

  async startShell(): Promise<boolean> {
    return false;
  }
  async stopShell(): Promise<void> {}

  isLogsStarted(): boolean {
    return false;
  }
  isShellStarted(): boolean {
    return false;
  }

  async initialize(): Promise<boolean> {
    return await this.startWda();
  }

  private async startWda() {
    if (this.realDevice) {
      let wdaBundleId = null;
      if (!_.isNil(this.goIosClient)) {
        wdaBundleId = await this.goIosClient.getWdaBundleId(this.device.getUdid());
      } else if (isMac()) {
        wdaBundleId = await IosUtils.getWdaBundleId(this.device);
      }
      if (_.isNil(wdaBundleId)) {
        return false;
      }

      console.log("WebdriverAgenPresent " + !_.isNil(wdaBundleId));
      await this.wdaProxy.createNewSession({
        wdaBundleId: wdaBundleId,
      });
      return await this.sessionCreated();
    } else if (isMac() && !this.realDevice) {
      await this.wdaProxy.createNewSession();
      return await this.sessionCreated();
    }
    return true;
  }

  private async sessionCreated() {
    try {
      log.info(
        `WDA Server started at : ${this.wdaProxy.getWebDriverAgentUrl()}. MjpegServer: ${this.wdaProxy.getMjpeServerUrl()}}`
      );
      this.screenInfo = await this.wdaProxy.getWindowSize();
      return true;
    } catch (err) {
      log.error(err);
      return false;
    }
  }

  async isStreamSuported(): Promise<boolean> {
    return this.wdaProxy.isStarted();
  }

  async isLogsSuported(): Promise<boolean> {
    return false;
  }

  async isShellSupported(): Promise<boolean> {
    return false;
  }

  async isControllSupported(): Promise<boolean> {
    if (this.wdaProxy.isStarted()) {
      try {
        console.log("Has session: " + (await this.wdaProxy.hasSession()));
        console.log("isSessionActive: " + (await this.wdaProxy.isSessionActive()));
        return !(await this.wdaProxy.hasSession()) || (await this.wdaProxy.isSessionActive());
      } catch (err) {
        console.log(err);
      }
      return false;
    }
    return this.wdaProxy.isStarted();
  }

  async startStream(): Promise<boolean> {
    if (!this.streamDecoder && this.wdaProxy.isStarted()) {
      console.log(this.wdaProxy.getMjpeServerUrl());
      this.streamDecoder = new MjpegDecoder(this.wdaProxy.getMjpeServerUrl());
      this.streamDecoder.on("frame", (frame, seq) => {
        this.streamListener.forEach((l) =>
          l.onStream({
            deviceId: this.device.getUdid(),
            frame: new Uint8Array(frame),
          })
        );
      });
      this.streamDecoder.on("abort", () => {
        this.streamListener.forEach((l) =>
          l.onStreamClosed({
            deviceId: this.device.getUdid(),
          })
        );
      });

      this.streamListener.forEach((l) => {
        l.onDeviceInfo({
          deviceId: this.device.getUdid(),
          info: this.screenInfo as any,
        });
      });
      this.streamStarted = true;
      this.streamDecoder.start();
    }
    return this.wdaProxy.isStarted();
  }

  async stopStream(): Promise<void> {
    if (!_.isNil(this.streamDecoder)) {
      this.streamDecoder.stop();
      this.streamDecoder = null;
      this.streamStarted = false;
    }
  }

  async startControl(): Promise<boolean> {
    const hasSession = await this.wdaProxy.hasSession();
    const isSessionActive = await this.wdaProxy.isSessionActive();
    console.log("Has Session:" + hasSession);
    if (!hasSession && this.wdaProxy.isStarted()) {
      this.wdaProxy.createNewSession();
      this.controlStarted = true;
    } else if (!isSessionActive) {
      this.controlStarted = false;
      return false;
    }
    this.controlStarted = true;
    return this.controlStarted;
  }

  async stopControl(): Promise<void> {
    await this.stopStream();
    this.controlStarted = false;
  }

  async stopAll(): Promise<void> {
    try {
      log.info("Quiting driver session");
      await this.wdaProxy.quit();
    } catch (err) {
      //
    }
    await this.stopStream();
  }

  isStreamStarted(): boolean {
    return this.streamStarted;
  }

  isControlStarted(): boolean {
    return this.controlStarted;
  }

  runShellCommand(command: string): void {
    throw new Error("Method not implemented.");
  }

  async installApp(app: Buffer, requestId: string, listener: IAppInstallationReciever): Promise<void> {}

  async executeControlMessage(message: any): Promise<void> {
    /* Block the command execution untill previous command is executed */
    await lock.execute(async () => {
      await this.actionController.onControlMessage(message);
    });
  }

  getScreenInfo(): DeviceDisplayInfo {
    return {
      videoSize: this.screenInfo,
    } as any;
  }

  async getConrolInfo(): Promise<any> {
    return [];
  }

  addStreamListener(id: string, listener: IStreamReciever): void {
    if (!this.streamListener.has(id)) {
      this.streamListener.set(id, listener);
    }
  }

  removeStreamListener(id: string): void {
    this.streamListener.delete(id);
  }

  addLogsListener(id: string, listener: IDeviceLogReciever): void {
    this.logListener.set(id, listener);
  }

  removeLogsListener(id: string): void {
    this.logListener.delete(id);
  }

  addShellListener(id: string, listener: IDeviceShellDataReciever): void {
    //
  }

  removeShellListener(id: string): void {
    //
  }

  async updateCapability(capability: WebdriverCapability): Promise<void> {
    const capabilityObj = capability.capabilities || capability;
    if (this.wdaProxy.isStarted()) {
      log.info("Updating webdriverAgenUrl capability for device " + this.device.getUdid());
      capabilityObj.alwaysMatch["appium:webDriverAgentUrl"] = this.wdaProxy.getWebDriverAgentUrl();
      capabilityObj.alwaysMatch["appium:deviceName"] = this.device.getName();
    }
  }
}
