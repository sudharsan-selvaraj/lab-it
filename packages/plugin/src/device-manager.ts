import { Device } from "appium-grid-common";
import { EventEmitter } from "events";
import { PluginEvents, SocketEvents } from "./contants";
import { IDeviceRepository, IDeviceTracker } from "./types";

export class DeviceManager implements IDeviceRepository {
  private deviceMap: Map<string, Device> = new Map();

  constructor(private deviceTracker: IDeviceTracker, private pluginEventEmitter: EventEmitter) {
    this.deviceTracker
      .onDeviceAdded((device: Device) => {
        this.addDevice(device);
        this.pluginEventEmitter.emit(PluginEvents.DEVICE_CONNECTED, device);
      })
      .onDeviceRemoved((device: Device) => {
        this.removeDevice(device.getUdid());
        this.pluginEventEmitter.emit(PluginEvents.DEVICE_DICONNECTED, device.getUdid());
      });
  }

  public addDevice(device: Device) {
    if (!this.deviceMap.has(device.getUdid())) {
      this.deviceMap.set(device.getUdid(), device);
    }
  }

  public removeDevice(deviceId: string) {
    this.deviceMap.delete(deviceId);
  }

  public blockDevice({ deviceUdid, sessionId }: { deviceUdid: string; sessionId?: string }) {
    this.deviceMap.get(deviceUdid)?.block(sessionId);
  }

  public unBlockDevice({ deviceUdid }: { deviceUdid: string }) {
    this.deviceMap.get(deviceUdid)?.unBlock();
  }

  public getDevices(): Array<Device> {
    return [...this.deviceMap.values()];
  }
}
