import { Device, GridDevice } from "appium-grid-common";
import { NodeManager } from "../nodes/node-manager";
import { Inject, Service } from "typedi";
import { Dependencies } from "../constants";

@Service()
export class BlockedAutomationDevicePool {
  private device: Map<String, GridDevice> = new Map();

  constructor(@Inject(Dependencies.NODE_MANAGER) private nodeManager: NodeManager) {}

  hasDevice(nodeId: string, deviceId: string) {
    return this.device.has(`${nodeId}:${deviceId}`);
  }

  addDevice(device: GridDevice) {
    this.device.set(`${device.getNodeId()}:${device.getUdid()}`, device);
  }

  removeDevice(nodeId: string, deviceId: string) {
    this.device.delete(`${nodeId}:${deviceId}`);
  }
}
