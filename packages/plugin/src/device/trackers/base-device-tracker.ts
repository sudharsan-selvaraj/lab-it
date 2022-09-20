import { Device } from "appium-grid-common";
import EventEmitter from "events";
import { IDeviceTracker } from "../../types";

export abstract class MobileDeviceTracker extends EventEmitter implements IDeviceTracker {
  private initialized: boolean = false;
  private deviceCache: Map<string, Device> = new Map();

  onDeviceAdded(cb: (device: Device) => any): IDeviceTracker {
    this.on("device_connected", cb);
    return this;
  }

  onDeviceRemoved(cb: (device: Device) => any): IDeviceTracker {
    this.on("device_removed", cb);
    return this;
  }

  abstract initialize(): Promise<void>;

  protected setInitialized(state: boolean) {
    this.initialized = state;
  }

  public isInitialized() {
    return this.initialized;
  }

  protected addDevice(devices: Array<Device>) {
    devices.forEach((d) => this.deviceCache.set(d.getUdid(), d));
  }

  protected hasDevice(deviceUdid: string) {
    return this.deviceCache.has(deviceUdid);
  }

  protected removeDevices(deviceUdids: Array<string>) {
    deviceUdids.forEach((d) => this.deviceCache.delete(d));
  }

  protected getDevice(deviceUdid: string) {
    return this.deviceCache.get(deviceUdid);
  }

  protected getAllDevices(): Array<Device> {
    return [...this.deviceCache.values()];
  }
}
