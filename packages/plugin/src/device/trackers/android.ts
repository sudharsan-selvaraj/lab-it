import { Device, DeviceMode, DeviceType, Platform, asyncForEach } from "appium-grid-common";
import { ADB } from "appium-adb";
import AdbKit, { Client, Device as AdbDevice } from "@devicefarmer/adbkit";
import _ from "lodash";
import { MobileDeviceTracker } from "./base-device-tracker";
import { Dependencies } from "../../contants";
import { Inject } from "typedi";
import EventEmitter from "events";
import { AdbUtils } from "../../utils/adb-utils";
import { getLogger } from "appium-grid-logger";
import { AbortController } from "node-abort-controller";
const log = getLogger("AndroidDeviceTracker");

export class AndroidDeviceTracker extends MobileDeviceTracker {
  private adbAvailable = true;
  private adbKit!: Client;
  private tracker!: EventEmitter;
  private adbUtils!: AdbUtils;
  private abortContol: Map<String, AbortController> = new Map();

  constructor(@Inject(Dependencies.ADB) private adb: ADB) {
    super();
    if (!adb) {
      this.adbAvailable = false;
    } else {
      this.adbKit = AdbKit.createClient({
        port: this.adb.getAdbServerPort(),
      });
      this.adbUtils = new AdbUtils(adb);
    }
  }

  async initialize(): Promise<void> {
    if (this.adbAvailable) {
      await this.loadDevices();
    }
    log.info("Android device tracker initalized");
  }

  private async onTrackerError(error: any) {
    log.info(`Device tracker error`);
    log.error(error);
  }

  private async startTracker() {
    if (!_.isNil(this.tracker)) {
      log.info(`Device tracker is down. Restarting...`);
      await this.stopTracker();
    }

    this.tracker = await this.adbKit.trackDevices();
    this.tracker.on("add", this.newDeviceConnected.bind(this));
    this.tracker.on("remove", this.onDeviceDisconnected.bind(this));
    this.tracker.on("end", this.startTracker.bind(this));
    this.tracker.on("error", this.onTrackerError.bind(this));
  }

  private async stopTracker() {
    this.tracker.off("add", this.newDeviceConnected.bind(this));
    this.tracker.off("remove", this.onDeviceDisconnected.bind(this));
    this.tracker.off("end", this.startTracker.bind(this));
    this.tracker.off("error", this.onTrackerError.bind(this));
    this.tracker = undefined as any;
  }

  private async loadDevices() {
    await this.startTracker();
    let connectedDevice = await this.adbKit.listDevices();
    await asyncForEach(connectedDevice, this.newDeviceConnected.bind(this));
  }

  private async newDeviceConnected(device: AdbDevice) {
    if (this.hasDevice(device.id)) {
      return;
    }
    log.info(`New android device connect: ${device.id}`);
    try {
      const abortContol = this.initiateAbortControl(device.id);
      await this.adbUtils.waitBootComplete(device.id, abortContol.signal);
      this.cancelAbort(device.id);
      const deviceProperties = await this.adbUtils.getDeviceProps(device.id);
      const isRealDevice = deviceProperties["ro.build.characteristics"] !== "emulator";
      const [total_cpu, total_mem] = await Promise.all([
        this.adbUtils.getTotalCpu(device.id),
        this.adbUtils.getTotalMemory(device.id),
      ]);

      //To get the phone's market name
      //ro.vendor.oplus.market.name
      //ro.product.product.marketname
      //ro.product.vendor.marketname
      const deviceInfo = new Device({
        udid: device.id,
        version: deviceProperties["ro.build.version.release"],
        name: isRealDevice ? deviceProperties["ro.product.name"] : deviceProperties["ro.kernel.qemu.avd_name"],
        platform: Platform.ANDROID,
        busy: false,
        type: isRealDevice ? DeviceType.REAL : DeviceType.EMULATOR,
        mode: DeviceMode.MOBILE,
        totalCpu: total_cpu,
        totalRam: total_mem,
        model: deviceProperties["ro.product.model"],
        manufacturer: deviceProperties["ro.product.manufacturer"],
      });
      log.error(`Device found`);
      this.addDevice([deviceInfo]);
      this.emit("device_connected", deviceInfo);
    } catch (err) {
      log.error(`Error capturing android device details for id ${device.id}`);
      log.error(err);
    }
  }

  private async onDeviceDisconnected(adbDevice: AdbDevice) {
    const device = this.getDevice(adbDevice.id);
    log.info(`Android device disconnected: ` + adbDevice.id);
    if (_.isNil(device)) {
      return this.abort(adbDevice.id);
    }
    if (!_.isNil(device)) {
      this.emit("device_removed", device);
      this.removeDevices([adbDevice.id]);
    }
  }

  private initiateAbortControl(deviceUdid: string) {
    const control = new AbortController();
    this.abortContol.set(deviceUdid, control);
    return control;
  }

  private abort(deviceUdid: string) {
    this.abortContol.get(deviceUdid)?.abort();
  }

  private cancelAbort(deviceUdid: string) {
    if (this.abortContol.has(deviceUdid)) {
      this.abortContol.delete(deviceUdid);
    }
  }
}
