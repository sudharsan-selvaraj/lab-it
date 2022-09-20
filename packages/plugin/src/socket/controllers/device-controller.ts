import {
  Device,
  SocketMessageEvent,
  NodeDeviceConnectMessage,
  NodeDeviceDisconnectMessage,
  BlockDeviceMessage,
  UnBlockDeviceMessage,
} from "appium-grid-common";
import { Dependencies, PluginEvents } from "../../contants";
import { BasePluginController } from "../base-plugin-controller";
import { getLogger } from "appium-grid-logger";
import Container from "typedi";
import { DeviceManager } from "../../device-manager";

const log = getLogger("AppiumNodeController");

export class DeviceController extends BasePluginController {
  private deviceManager!: DeviceManager;

  protected initialize(): void {
    super.initialize();
    this.deviceManager = Container.get(Dependencies.DEVICE_MANAGER);
    this.onPluginEvent(PluginEvents.DEVICE_CONNECTED, this.onNewDeviceConnected.bind(this));
    this.onPluginEvent(PluginEvents.DEVICE_DICONNECTED, this.onDeviceDisconnected.bind(this));

    this.onPluginEvent(PluginEvents.BLOCK_DEVICE, this.blockDevice.bind(this));
    this.onPluginEvent(PluginEvents.UNBLOCK_DEVICE, this.unBlockDevice.bind(this));
  }

  private onNewDeviceConnected(device: Device) {
    this.sendMessage<NodeDeviceConnectMessage>(SocketMessageEvent.DEVICE_CONNECTED, {
      device,
    });
  }

  private onDeviceDisconnected(deviceUdid: string) {
    this.sendMessage<NodeDeviceDisconnectMessage>(SocketMessageEvent.DEVICE_DISCONNECTED, {
      deviceUdid: deviceUdid,
    });
  }

  private blockDevice({ deviceUdid, sessionId }: { deviceUdid: string; sessionId?: string }) {
    this.deviceManager.blockDevice({ deviceUdid, sessionId });
    this.sendMessage<BlockDeviceMessage>(SocketMessageEvent.DEVICE_BLOCK, {
      deviceUdid,
      sessionId,
    });
  }

  private unBlockDevice(deviceUdid: string) {
    this.deviceManager.unBlockDevice({ deviceUdid });
    this.sendMessage<UnBlockDeviceMessage>(SocketMessageEvent.DEVICE_UNBLOCK, {
      deviceUdid: deviceUdid,
    });
  }
}
