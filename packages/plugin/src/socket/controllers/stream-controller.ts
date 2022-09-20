import {
  DeviceControlAvailabilityMessage,
  DeviceLogMessage,
  DeviceRunShellCommandMessage,
  DeviceDisplayInfo,
  SocketMessage,
  SocketMessageEvent,
  StreamClosedMessage,
  StreamDeviceInfoMessage,
  StreamImageMessage,
  StreamStartMessage,
  StreamStopMessage,
  SocketProxyMessage,
} from "appium-grid-common";

import { SocketController } from "appium-grid-socket";
import { Dependencies } from "../../contants";
import Container from "typedi";
import { RemoteDeviceControlManager } from "../../device/remote-control";
import { IAppInstallationReciever, IDeviceLogReciever, IDeviceShellDataReciever, IStreamReciever } from "../../types";
import { v4 as udid } from "uuid";
import { ExecuteLock } from "appium-grid-common";
import { getLogger } from "appium-grid-logger";

const log = getLogger("DeviceStreamController");
const lock = new ExecuteLock("DeviceStreamLock");

export class StreamController
  extends SocketController
  implements IStreamReciever, IDeviceLogReciever, IDeviceShellDataReciever, IAppInstallationReciever
{
  private remoteDeviceController!: RemoteDeviceControlManager;
  private streamListenerId = udid();

  initialize(): void {
    super.initialize();
    this.remoteDeviceController = Container.get(Dependencies.REMOTE_DEVICE_CONTROL_MANAGER);
    this.onMessage(SocketMessageEvent.GET_DEVICE_CONTROL_INFO, this.sendDeviceControlInfo.bind(this));

    this.onMessage(SocketMessageEvent.STREAM_START, this.startStream.bind(this));
    this.onMessage(SocketMessageEvent.STREAM_STOP, this.stopStream.bind(this));

    this.onMessage(SocketMessageEvent.DEVICE_START_LOGS, this.startLogs.bind(this));
    this.onMessage(SocketMessageEvent.DEVICE_STOP_LOGS, this.stopLogs.bind(this));

    this.onMessage(SocketMessageEvent.DEVICE_START_SHELL, this.startShell.bind(this));
    this.onMessage(SocketMessageEvent.DEVICE_STOP_SHELL, this.stopShell.bind(this));

    this.onMessage(SocketMessageEvent.DEVICE_CONTROL_COMMAND, this.executeDeviceControllMessage.bind(this));
    this.onMessage(SocketMessageEvent.DEVICE_RUN_SHELL_COMMAND, this.runShellCommand.bind(this));

    this.onMessage(SocketMessageEvent.DEVICE_INSTALL_APP, this.installApp.bind(this));
  }

  private getDeviceController(deviceUdid: string) {
    return this.remoteDeviceController.getController(deviceUdid);
  }

  private async sendDeviceControlInfo(event: string, message: SocketMessage<SocketProxyMessage>) {
    const { deviceUdid } = message.data;
    await lock.execute(async () => {
      const controller = this.getDeviceController(deviceUdid);
      let controlInfo = {
        deviceUdid: deviceUdid,
        stream_available: false,
        control_available: false,
        logs_available: false,
        shell_available: false,
      };
      if (controller) {
        controlInfo = {
          deviceUdid: deviceUdid,
          stream_available: await controller.isStreamSuported(),
          control_available: await controller.isControllSupported(),
          logs_available: await controller.isLogsSuported(),
          shell_available: await controller.isShellSupported(),
        };
      }
      return this.sendMessage<DeviceControlAvailabilityMessage>(SocketMessageEvent.STREAM_CONTROL_INFO, controlInfo);
    });
  }

  private async startStream(event: string, message: SocketMessage<StreamStartMessage>) {
    const { deviceUdid, startControl } = message.data;
    await lock.execute(async () => {
      log.info(`Request to start live stream for device ${deviceUdid}`);
      const controller = this.getDeviceController(deviceUdid);
      if (controller) {
        if (!(await controller.isStreamSuported())) {
          log.info(`Live stream not available for device ${deviceUdid}`);
          return this.sendMessage(SocketMessageEvent.STREAM_NOT_AVAILABLE, {
            deviceUdid: deviceUdid,
          });
        }
        if (!controller.isStreamStarted()) {
          log.info(`Starting stream for device ${deviceUdid}`);
          controller.addStreamListener(this.streamListenerId, this);
          await controller.startStream();
        } else {
          log.info(`Stream already started for ${deviceUdid}`);
          this.onDeviceInfo({
            deviceId: deviceUdid,
            info: controller.getScreenInfo(),
          });
        }

        if (startControl) {
          if (!(await controller.isControllSupported())) {
            log.info(`Control not available for device ${deviceUdid}`);
            return this.sendMessage(SocketMessageEvent.CONTROL_NOT_AVAILABLE, {
              deviceUdid: deviceUdid,
            });
          }

          if (!controller.isControlStarted()) {
            log.info(`Starting control for device ${deviceUdid}`);
            controller.addLogsListener(this.streamListenerId, this);
            controller.addShellListener(this.streamListenerId, this);
            await controller.startControl();
          }
        }
      }
    });
  }

  private async stopStream(event: string, message: SocketMessage<StreamStopMessage>) {
    const { deviceUdid } = message.data;
    await lock.execute(async () => {
      log.info(`Request to stop live stream for device ${deviceUdid}`);
      const controller = this.getDeviceController(deviceUdid);
      if (controller) {
        if (controller.isStreamStarted()) {
          await controller.stopStream();
          controller.removeStreamListener(this.streamListenerId);
        }

        if (controller.isControlStarted()) {
          await controller.stopControl();
          controller.removeLogsListener(this.streamListenerId);
          controller.removeShellListener(this.streamListenerId);
        }
      }
    });
  }

  private async startLogs(event: string, message: SocketMessage<SocketProxyMessage>) {
    const { deviceUdid } = message.data;
    await lock.execute(async () => {
      log.info(`Request to start logs stream for device ${deviceUdid}`);
      const controller = this.getDeviceController(deviceUdid);
      if (controller && (await controller.isLogsSuported())) {
        await controller.startLogs();
      }
    });
  }

  private async stopLogs(event: string, message: SocketMessage<SocketProxyMessage>) {
    const { deviceUdid } = message.data;
    await lock.execute(async () => {
      log.info(`Request to stop logs stream for device ${deviceUdid}`);
      const controller = this.getDeviceController(deviceUdid);
      if (controller && (await controller.isLogsSuported())) {
        await controller.stopLogs();
      }
    });
  }

  private async startShell(event: string, message: SocketMessage<SocketProxyMessage>) {
    const { deviceUdid } = message.data;
    await lock.execute(async () => {
      log.info(`Request to start shell for device ${deviceUdid}`);
      const controller = this.getDeviceController(deviceUdid);
      if (controller && (await controller.isShellSupported())) {
        await controller.startShell();
      }
    });
  }

  private async stopShell(event: string, message: SocketMessage<SocketProxyMessage>) {
    const { deviceUdid } = message.data;
    await lock.execute(async () => {
      log.info(`Request to stop shell stream for device ${deviceUdid}`);
      const controller = this.getDeviceController(deviceUdid);
      if (controller && (await controller.isShellStarted())) {
        await controller.stopShell();
      }
    });
  }

  private async runShellCommand(event: string, message: SocketMessage<DeviceRunShellCommandMessage>) {
    const { deviceUdid, command } = message.data;
    const controller = this.getDeviceController(deviceUdid);
    if (controller && controller.isShellStarted()) {
      controller.runShellCommand(command);
    }
  }

  private async executeDeviceControllMessage(event: string, message: SocketMessage<any>) {
    const { deviceUdid, command } = message.data;
    const controller = this.getDeviceController(deviceUdid);
    if (controller && controller.isControlStarted()) {
      controller.executeControlMessage(message.data);
    }
  }

  private async installApp(event: string, message: SocketMessage<{ app: any; deviceUdid: string }>) {
    const { app, deviceUdid } = message.data;
    const controller = this.getDeviceController(deviceUdid);
    if (controller && controller.isControlStarted()) {
      controller.installApp(app, message.requestId, this);
    }
  }

  /* All below methods will listen for events from Device remote controls and proxy it to hub  */

  public onStream(opts: { deviceId: string; frame: ArrayBuffer }) {
    const { deviceId, frame } = opts;
    return this.sendMessage<StreamImageMessage>(SocketMessageEvent.STREAM_IMAGE, {
      deviceUdid: deviceId,
      frame,
    });
  }

  onDeviceInfo(opts: { deviceId: string; info: DeviceDisplayInfo }) {
    const { deviceId, info } = opts;
    return this.sendMessage<StreamDeviceInfoMessage>(SocketMessageEvent.STREAM_DEVICE_INFO, {
      deviceUdid: deviceId,
      deviceInfo: info,
    });
  }

  public onLog(opts: { deviceId: string; log: string }) {
    const { deviceId, log } = opts;
    this.sendMessage<DeviceLogMessage>(SocketMessageEvent.DEVICE_SYS_LOG, {
      log,
      deviceUdid: deviceId,
    });
  }

  public onShellData(opts: { deviceId: string; log: string }) {
    const { deviceId, log } = opts;
    this.sendMessage<DeviceLogMessage>(SocketMessageEvent.DEVICE_SHELL_LOG, {
      log,
      deviceUdid: deviceId,
    });
  }

  onStreamClosed(opts: { deviceId: string }) {
    const { deviceId } = opts;
    log.info(`Stream closed for device ${deviceId}`);
    this.sendMessage<StreamClosedMessage>(SocketMessageEvent.STREAM_CLOSED, {
      deviceUdid: deviceId,
    });
    const controller = this.getDeviceController(opts.deviceId);
    if (controller) {
      controller.removeStreamListener(this.streamListenerId);
    }
  }

  onInstallationStarted(opts: { deviceId: string; requestId: string }) {
    const { deviceId, requestId } = opts;
    console.log("Installation started");
    this.sendMessage<any>(SocketMessageEvent.DEVICE_INSTALL_APP_STARTED, {
      requestId: requestId,
      deviceUdid: deviceId,
    });
  }

  onInstallationLog(opts: { deviceId: string; log: string; requestId: string }) {
    // const { deviceId, requestId } = opts;
    // this.sendMessage<any>(SocketMessageEvent.DEVICE_INSTALL_APP_STARTED, {
    //   requestId: requestId,
    //   deviceUdid: deviceId,
    // });
  }

  onAppInstallationComplete(opts: { deviceId: string; success: boolean; requestId: string }) {
    console.log("Installation Completed");
    const { deviceId, requestId, success } = opts;
    this.sendMessage<any>(SocketMessageEvent.DEVICE_INSTALL_APP_COMPLETED, {
      success: success,
      deviceUdid: deviceId,
      requestId,
    });
  }
}
