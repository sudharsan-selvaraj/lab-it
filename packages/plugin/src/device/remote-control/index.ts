import { Device, Platform, WebdriverCapability } from "appium-grid-common";
import { REMOTE_CONTROL_DEVICE_TOKEN } from "../../di/tokens";
import { IDeviceTracker, IRemoteDeviceController } from "src/types";
import Container from "typedi";
import { AndroidRemoteDeviceController } from "./android/android-remote-controller";
import { IosRemoteControl } from "./ios";
import { EventEmitter } from "stream";
import { PluginEvents } from "../../contants";

const controllerFulfillmentMap: Partial<Record<Platform, new (device: Device) => IRemoteDeviceController>> = {
  [Platform.ANDROID]: AndroidRemoteDeviceController,
  [Platform.IOS]: IosRemoteControl,
};

export class RemoteDeviceControlManager {
  private controllers: Map<string, IRemoteDeviceController> = new Map();

  constructor(private pluginEventEmitter: EventEmitter, private deviceTracker: IDeviceTracker) {
    this.deviceTracker.onDeviceAdded(this.onNewDeviceConnected.bind(this));
    this.deviceTracker.onDeviceRemoved(this.onDeviceDisconnected.bind(this));

    this.pluginEventEmitter.on(PluginEvents.PROCESS_KILLED, this.onProcessKilled.bind(this));
  }

  private async onNewDeviceConnected(device: Device) {
    const controller = controllerFulfillmentMap[device.getPlatform()];
    if (controller) {
      const controllerInstance = Container.of(device.getUdid())
        .set(REMOTE_CONTROL_DEVICE_TOKEN, device)
        .get(controller);

      await controllerInstance.initialize();
      this.controllers.set(device.getUdid(), controllerInstance);
    }
  }

  private async onDeviceDisconnected(device: Device) {
    const controller = this.controllers.get(device.getUdid());
    if (controller) {
      await controller.stopAll();
    }
    this.controllers.delete(device.getUdid());
  }

  public async updateCapability(deviceUdid: string, capability: WebdriverCapability) {
    const controller = this.controllers.get(deviceUdid);
    if (controller) {
      console.log(`Updating capability for device ${deviceUdid}`);
      await controller.updateCapability(capability);
    }
  }

  public getController(deviceId: string): IRemoteDeviceController | undefined {
    return this.controllers.get(deviceId);
  }

  private async onProcessKilled() {
    const promiseArray = [...this.controllers.values()].map((c) => c.stopAll());
    await Promise.all(promiseArray);
  }
}
