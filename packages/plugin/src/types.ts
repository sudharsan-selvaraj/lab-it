import { Device, DeviceType, Platform, DeviceDisplayInfo, WebdriverCapability } from "appium-grid-common";

export interface IDeviceTracker {
  onDeviceAdded(cb: (device: Device) => any): IDeviceTracker;
  onDeviceRemoved(cb: (device: Device) => any): IDeviceTracker;
  initialize(): Promise<void>;
  isInitialized(): boolean;
}

export interface IDeviceFilterOptions {
  platform?: Platform;
  name?: string;
  busy?: boolean;
  offline?: boolean;
  udid?: any[];
  deviceType?: DeviceType;
}

export interface IDeviceRepository {
  getDevices(): Array<Device>;
}

export interface IRemoteDeviceController {
  initialize(): Promise<boolean>;

  isStreamSuported(): Promise<boolean>;
  isLogsSuported(): Promise<boolean>;
  isShellSupported(): Promise<boolean>;
  isControllSupported(): Promise<boolean>;

  startStream(): Promise<boolean>;
  stopStream(): Promise<void>;

  startControl(): Promise<boolean>;
  stopControl(): Promise<void>;

  startLogs(): Promise<boolean>;
  stopLogs(): Promise<void>;

  startShell(): Promise<boolean>;
  stopShell(): Promise<void>;

  stopAll(): Promise<void>;

  isStreamStarted(): boolean;
  isControlStarted(): boolean;
  isLogsStarted(): boolean;
  isShellStarted(): boolean;

  runShellCommand(command: string): void;
  installApp(app: Buffer, requestId: string, listener: IAppInstallationReciever): Promise<void>;

  executeControlMessage(message: any): Promise<void>;
  getScreenInfo(): DeviceDisplayInfo;
  getConrolInfo(): Promise<any>;

  addStreamListener(id: string, listener: IStreamReciever): void;
  addLogsListener(id: string, listener: IDeviceLogReciever): void;
  addShellListener(id: string, listener: IDeviceShellDataReciever): void;

  removeStreamListener(id: string): void;
  removeLogsListener(id: string): void;
  removeShellListener(id: string): void;

  /* Automation related methods */
  updateCapability(capability: WebdriverCapability): Promise<void>;
}

export interface IStreamReciever {
  onDeviceInfo: (opts: { deviceId: string; info: DeviceDisplayInfo }) => void;
  onStream: (opts: { deviceId: string; frame: ArrayBuffer | Buffer }) => void;
  onStreamClosed: (opts: { deviceId: string }) => void;
}

export interface IDeviceLogReciever {
  onLog: (data: { deviceId: string; log: string }) => void;
}

export interface IDeviceShellDataReciever {
  onShellData: (data: { deviceId: string; log: string }) => void;
}

export interface ISocketMessageSender {
  sendMessage: <T>(data: { deviceId: string; message: T }) => void;
}

export interface IAppInstallationReciever {
  onInstallationStarted: (opts: { deviceId: string; requestId: string }) => void;
  onInstallationLog: (opts: { deviceId: string; log: string; requestId: string }) => void;
  onAppInstallationComplete: (opts: { deviceId: string; success: boolean; requestId: string }) => void;
}
