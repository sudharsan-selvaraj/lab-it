import { DeviceDisplayInfo, WebdriverCapability } from "appium-grid-common";
import {
  IAppInstallationReciever,
  IDeviceLogReciever,
  IDeviceShellDataReciever,
  IRemoteDeviceController,
  IStreamReciever,
} from "../../types";

export abstract class RemoteControlHandler implements IRemoteDeviceController {
  abstract initialize(): Promise<boolean>;

  abstract isStreamSuported(): Promise<boolean>;
  abstract isLogsSuported(): Promise<boolean>;
  abstract isShellSupported(): Promise<boolean>;
  abstract isControllSupported(): Promise<boolean>;

  abstract startStream(): Promise<boolean>;
  abstract stopStream(): Promise<void>;

  abstract startControl(): Promise<boolean>;
  abstract stopControl(): Promise<void>;

  abstract startLogs(): Promise<boolean>;
  abstract stopLogs(): Promise<void>;

  abstract startShell(): Promise<boolean>;
  abstract stopShell(): Promise<void>;

  abstract stopAll(): Promise<void>;

  abstract isStreamStarted(): boolean;
  abstract isControlStarted(): boolean;
  abstract isLogsStarted(): boolean;
  abstract isShellStarted(): boolean;

  abstract runShellCommand(command: string): void;

  abstract installApp(app: Buffer, requestId: string, listener: IAppInstallationReciever): Promise<void>;

  abstract executeControlMessage(message: any): Promise<void>;
  abstract getScreenInfo(): DeviceDisplayInfo;
  abstract getConrolInfo(): Promise<any>;

  abstract addStreamListener(id: string, listener: IStreamReciever): void;
  abstract addLogsListener(id: string, listener: IDeviceLogReciever): void;
  abstract addShellListener(id: string, listener: IDeviceShellDataReciever): void;

  abstract removeStreamListener(id: string): void;
  abstract removeLogsListener(id: string): void;
  abstract removeShellListener(id: string): void;

  async updateCapability(capability: WebdriverCapability): Promise<void> {
    // override in child class
  }
}
