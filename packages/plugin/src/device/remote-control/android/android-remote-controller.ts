import ADB from "appium-adb";
import { Device, Platform, DeviceDisplayInfo } from "appium-grid-common";
import { Dependencies } from "../../../contants";
import {
  IAppInstallationReciever,
  IDeviceLogReciever,
  IDeviceShellDataReciever,
  IStreamReciever,
} from "../../../types";
import Container, { Inject, Service } from "typedi";
import { ScrcpyServer } from "./scrcpy-server";
import { AndroidDevice } from "./android-device";
import { Configuration } from "../../../config";
import { REMOTE_CONTROL_DEVICE_TOKEN } from "../../../di/tokens";
import { ExecuteLock } from "appium-grid-common";
import { getLogger } from "appium-grid-logger";
import WebSocket, { MessageEvent } from "ws";
import { AndroidLogCatLogger } from "./android-logcat-logger";
import { AndroidShell } from "./android-shell";
import { isBoolean, isNumber } from "lodash";
import { RemoteControlHandler } from "../remote-control-handler";
import { AndroidApkInstaller } from "./apk-installer";
const log = getLogger("AndroidRemoteDeviceControl");

@Service({ transient: true })
export class AndroidRemoteDeviceController extends RemoteControlHandler {
  private streamAvailable: boolean = false;
  private logsAvailabe: boolean = true;
  private shellAvailable: boolean = true;
  private controlSupported: boolean = true;

  private streamStarted: boolean = false;
  private controlStarted: boolean = false;
  private logsStarted: boolean = false;
  private shellStarted: boolean = false;

  private streamListener: Map<string, IStreamReciever> = new Map();
  private logListener: Map<string, IDeviceLogReciever> = new Map();
  private shellListener: Map<string, IDeviceShellDataReciever> = new Map();

  private androidDevice!: AndroidDevice;
  private scrcpyServer!: ScrcpyServer;
  private adb!: ADB;
  private config!: Configuration;
  private androidLogger!: AndroidLogCatLogger;
  private androidShell: AndroidShell;
  private apkInstaller!: AndroidApkInstaller;
  private ws!: WebSocket | undefined;
  private executeLock: ExecuteLock = new ExecuteLock("ADNROID_SCRCPY_START");
  private screenInfo!: DeviceDisplayInfo;

  constructor(@Inject(REMOTE_CONTROL_DEVICE_TOKEN) private device: Device) {
    super();
    this.adb = Container.get(Dependencies.ADB);
    this.config = Container.get(Dependencies.CONFIGURATION);
    this.androidDevice = new AndroidDevice(device, this.adb);
    this.scrcpyServer = new ScrcpyServer(this.config, this.androidDevice);
    this.androidLogger = new AndroidLogCatLogger(this.androidDevice);
    this.apkInstaller = new AndroidApkInstaller(this.androidDevice);
    this.androidLogger.addListener("on_log", (log) => {
      [...this.logListener.values()].forEach((l) =>
        l.onLog({
          deviceId: this.device.getUdid(),
          log,
        })
      );
    });

    this.androidShell = new AndroidShell(this.androidDevice);
    this.androidShell.addListener("on_shell_data", (data) => {
      [...this.shellListener.values()].forEach((l) =>
        l.onShellData({
          deviceId: this.device.getUdid(),
          log: data,
        })
      );
    });
  }

  async startLogs(): Promise<boolean> {
    if (!this.logsStarted) {
      await this.androidLogger.startLogCapture();
      this.logsStarted = true;
    }
    return true;
  }

  async stopLogs(): Promise<void> {
    if (this.logsStarted) {
      await this.androidLogger.stopLogCapture();
      this.logsStarted = false;
    }
  }

  async startShell(): Promise<boolean> {
    if (!this.shellStarted) {
      await this.androidShell.start();
      this.shellStarted = true;
    }
    return true;
  }

  async stopShell(): Promise<void> {
    if (this.shellStarted) {
      await this.androidShell.start();
      this.shellStarted = false;
    }
  }

  isLogsStarted(): boolean {
    return this.logsStarted;
  }

  isShellStarted(): boolean {
    return this.shellStarted;
  }

  getScreenInfo(): DeviceDisplayInfo {
    return this.screenInfo;
  }

  //TODO send installed packages
  async getConrolInfo() {
    return [];
  }

  getSupportedPlatform(): Platform[] {
    return [Platform.ANDROID];
  }

  async isStreamSuported(): Promise<boolean> {
    return this.streamAvailable;
  }

  async isLogsSuported(): Promise<boolean> {
    return this.logsAvailabe;
  }

  async isShellSupported(): Promise<boolean> {
    return this.shellAvailable;
  }

  async isControllSupported(): Promise<boolean> {
    return this.controlSupported;
  }

  isStreamStarted(): boolean {
    return this.streamStarted;
  }

  async startStream(): Promise<boolean> {
    return await this.executeLock.execute(async () => {
      if (!this.streamAvailable) {
        return false;
      }
      if (!this.ws || this.ws.readyState != WebSocket.OPEN) {
        this.ws = new WebSocket(`ws://127.0.0.1:${this.scrcpyServer.getPort()}`);
        this.ws.binaryType = "arraybuffer";
        this.ws.addEventListener("open", () => {
          log.info("Connected to scrcpy server for device " + this.device.getUdid());
          this.ws?.send(
            JSON.stringify({
              message: "start",
            })
          );
        });
        this.ws.addEventListener("message", this.onScrcpyMessage.bind(this));
        this.ws.addEventListener("error", this.onScrcpyConnectionClosed.bind(this));
        this.ws.addEventListener("close", this.onScrcpyConnectionClosed.bind(this));
      }
      this.streamStarted = true;
      return this.streamStarted;
    });
  }

  async stopStream(): Promise<void> {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
      this.ws = undefined;
    }
    this.streamStarted = false;
  }

  isControlStarted(): boolean {
    return this.controlStarted;
  }

  async startControl(): Promise<boolean> {
    if (!this.streamStarted) {
      await this.startStream();
    }
    this.controlStarted = true;
    return this.controlStarted;
  }

  async stopControl(): Promise<void> {
    await this.stopStream();
    await this.stopLogs();
    await this.stopShell();
    this.controlStarted = false;
  }

  async stopAll(): Promise<void> {
    if (this.streamStarted) {
      await this.stopStream();
    }
    await this.stopControl();
  }

  runShellCommand(command: string): void {
    this.androidShell.execute(command);
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

  addShellListener(id: string, listener: IDeviceShellDataReciever): void {
    this.shellListener.set(id, listener);
  }

  removeLogsListener(id: string): void {
    this.logListener.delete(id);
  }

  removeShellListener(id: string): void {
    this.shellListener.delete(id);
  }

  async initialize(): Promise<boolean> {
    try {
      this.streamAvailable = await this.scrcpyServer.run();
    } catch (err) {
      this.streamAvailable = false;
    }
    return this.streamAvailable;
  }

  async installApp(app: Buffer, requestId: string, listener: IAppInstallationReciever): Promise<void> {
    this.apkInstaller.install(app, requestId, listener);
  }

  async executeControlMessage(message: any): Promise<void> {
    const stringMessage = JSON.stringify(message, (key, value) => {
      if (isNumber(value)) {
        return value + "";
      } else if (isBoolean(value)) {
        return JSON.stringify(value);
      }
      return value;
    });
    this.ws?.send(stringMessage);
  }

  private onScrcpyMessage(event: MessageEvent) {
    try {
      const message = event.data;
      if (typeof message === "string") {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage && parsedMessage.message === "device_info") {
          this.screenInfo = parsedMessage.data.screenInfo;
          [...this.streamListener.values()].forEach((l) =>
            l.onDeviceInfo({ deviceId: this.device.getUdid(), info: this.screenInfo })
          );
        }
      } else {
        [...this.streamListener.values()].forEach((l) =>
          l.onStream({ deviceId: this.device.getUdid(), frame: message as any })
        );
      }
    } catch (err) {}
  }

  private onScrcpyConnectionClosed(err?: any) {
    this.streamStarted = false;
    [...this.streamListener.values()].forEach((l) => l.onStreamClosed({ deviceId: this.device.getUdid() }));
  }
}
