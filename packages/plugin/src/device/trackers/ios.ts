import { asyncForEach, Device, DeviceMode, DeviceType, Platform } from "appium-grid-common";
import { MobileDeviceTracker } from "./base-device-tracker";
import Simctl from "node-simctl";
import { utilities as IOSUtils } from "appium-ios-device";
import _ from "lodash";
import { isMac } from "../../utils/common";
import { getLogger } from "appium-grid-logger";
import { IosUtils } from "../../utils/ios-utils";

const log = getLogger("IosDeviceTracker");

export class IosDeviceTracker extends MobileDeviceTracker {
  private pollingTimer!: NodeJS.Timer;
  private simctl!: any;
  private trackSimulators = true;

  async initialize(): Promise<void> {
    if (!!this.pollingTimer) {
      return;
    }
    try {
      this.simctl = new Simctl();
    } catch (err) {
      log.error("Simctl not found");
    }

    await this.collectDeviceDetails();
    this.pollingTimer = setInterval(this.collectDeviceDetails.bind(this), 10000);
    log.info("Ios device tracker initalized");
  }

  async collectDeviceDetails() {
    const [emulators, realDevices] = await Promise.all([this.getSimulators(), this.getRealDevices()]);

    const added = ([] as any[]).concat(...emulators.added, ...realDevices.added);
    const removed = ([] as any[]).concat(...emulators.removed, ...realDevices.removed);

    await asyncForEach(added, async (device) => {
      this.addDevice([device]);
      this.emit("device_connected", device);
    });

    await asyncForEach(removed, async (device) => {
      this.emit("device_removed", device);
      this.removeDevices([device.getUdid()]);
    });
  }

  private async getSimulators(): Promise<{ added: Array<Device>; removed: Array<Device> }> {
    if (!isMac() && !this.trackSimulators) {
      return { added: [], removed: [] };
    }
    try {
      const added: Array<Device> = [],
        removed: Array<Device> = [];
      const devices = await this.simctl.getDevices();
      _.flatten(Object.values(devices)).forEach((d: any) => {
        if (this.hasDevice(d.udid)) {
          if (d.state?.toLowerCase() == "shutdown") {
            removed.push(this.getDevice(d.udid) as Device);
          }
        } else if (d.state?.toLowerCase() == "booted") {
          added.push(
            new Device({
              name: d.name,
              version: d.sdk,
              udid: d.udid,
              type: DeviceType.SIMULATOR,
              busy: false,
              model: this.getSimulatorModel(d.name),
              mode: d.name.toLowerCase().indexOf("ipad") >= 0 ? DeviceMode.TABLET : DeviceMode.MOBILE,
              platform: d.platform.toLowerCase(),
            })
          );
        }
      });

      return { added, removed };
    } catch (err) {
      this.trackSimulators = false;
      log.error(err);
      return { added: [], removed: [] };
    }
  }

  private async getRealDevices(): Promise<{ added: Array<Device>; removed: Array<Device> }> {
    if (!isMac()) {
      return { added: [], removed: [] };
    }
    try {
      const conenctedDevices = await IOSUtils.getConnectedDevices();
      const added: Array<Device> = [];
      const removed: Array<Device> = this.getAllDevices().filter(
        (d) => IosUtils.isReal(d) && conenctedDevices.indexOf(d.getUdid()) < 0
      );

      await asyncForEach(
        conenctedDevices.filter((d: string) => !this.hasDevice(d)),
        async (udid: string) => {
          const deviceInfo = await IOSUtils.getDeviceInfo(udid);
          const isIpad = deviceInfo["DeviceClass"]?.toLowerCase().trim() === "ipad";
          added.push(
            new Device({
              udid,
              version: deviceInfo["ProductVersion"],
              name: deviceInfo["DeviceName"],
              model: deviceInfo["ProductType"],
              busy: false,
              mode: isIpad ? DeviceMode.TABLET : DeviceMode.MOBILE,
              type: DeviceType.REAL,
              platform: Platform.IOS,
            })
          );
        }
      );

      return { added, removed };
    } catch (err) {
      log.error("Error fetching real device count");
      return { added: [], removed: [] };
    }
  }

  private getSimulatorModel(simulatorName: string) {
    if (simulatorName.toLowerCase().includes("iphone")) {
      return "Iphone";
    } else if (simulatorName.toLowerCase().includes("ipad")) {
      return "Ipad";
    }
  }
}
