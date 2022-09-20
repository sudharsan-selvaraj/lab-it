import ADB from "appium-adb";
import { asyncForEach, Device } from "appium-grid-common";
import { IDeviceTracker } from "../../types";
import { AndroidDeviceTracker } from "./android";
import { IosDeviceTracker } from "./ios";

class DeviceTracker implements IDeviceTracker {
  private initialized: boolean = false;
  private deviceTrackers: Array<IDeviceTracker> = [];

  constructor(private adb: ADB) {
    this.deviceTrackers = [new AndroidDeviceTracker(adb), new IosDeviceTracker()];
  }

  async initialize(): Promise<void> {
    await asyncForEach(this.deviceTrackers, async (tracker: IDeviceTracker) => await tracker.initialize());
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  onDeviceAdded(cb: (device: Device) => any): IDeviceTracker {
    this.deviceTrackers.forEach((tracker) => tracker.onDeviceAdded(cb));
    return this;
  }

  onDeviceRemoved(cb: (device: Device) => any): IDeviceTracker {
    this.deviceTrackers.forEach((tracker) => tracker.onDeviceRemoved(cb));
    return this;
  }
}

export { DeviceTracker };
