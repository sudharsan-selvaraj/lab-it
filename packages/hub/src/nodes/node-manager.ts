import { GridDevice, ExecuteLock } from "appium-grid-common";
import _ from "lodash";
import { Node } from "./node";
import { getLogger } from "appium-grid-logger";
import { INodeDeviceStreamController } from "../types";

const log = getLogger("NodeManager");

export interface RemoteDeviceController {
  streamController: INodeDeviceStreamController;
}

export class NodeManager {
  private nodeMap: Map<string, Node> = new Map();
  private controllerMap: Map<string, RemoteDeviceController> = new Map();

  private asyncLock: ExecuteLock = new ExecuteLock("NODE_COMMAND_GAURD");

  public async getAllNodes(): Promise<Array<Node>> {
    return await this.executeSync(() => {
      return [...this.nodeMap.values()];
    });
  }

  public getNodeById(nodeId: string) {
    return this.nodeMap.get(nodeId);
  }

  public async addNode(node: Node, controllers: RemoteDeviceController) {
    await this.executeSync(() => {
      if (this.nodeMap.has(node.getId())) {
        log.info(`Node is already available. So re-registering the new node`);
      }
      this.nodeMap.set(node.getId(), node);
      this.controllerMap.set(node.getId(), controllers);
      log.info(`Succcessfully added new node : ${node.getId()}`);
      log.info(`Total number of registered  nodes: ${this.nodeMap.size}`);
    });
  }

  public async isNodeActive(nodeId: string) {
    await this.executeSync(() => {
      if (!this.nodeMap.has(nodeId)) {
        this.nodeMap.get(nodeId)?.getIsActive();
      } else {
        return false;
      }
    });
  }

  public async setNodeOffline(nodeId: string) {
    await this.executeSync(() => {
      if (this.nodeMap.has(nodeId)) {
        this.nodeMap.get(nodeId)?.setIsActive(false);
        log.info(`Making node ${nodeId} inactive`);
      }
    });
  }

  public async setNodeOnline(nodeId: string) {
    await this.executeSync(() => {
      if (!this.nodeMap.has(nodeId)) {
        this.nodeMap.get(nodeId)?.setIsActive(true);
        log.info(`Making node ${nodeId} back to active`);
      }
    });
  }

  public async addDeviceToNode(nodeId: string, device: GridDevice) {
    await this.executeSync(() => {
      if (this.nodeMap.has(nodeId)) {
        this.nodeMap.get(nodeId)?.addDevice(device);
        log.info(`Adding device with id ${device.getUdid()} to node ${nodeId}`);
        log.info(`Total device available in node ${nodeId} : ${this.nodeMap.get(nodeId)?.getDevices().length}`);
      }
    });
  }

  public async deleteDeviceInNode(nodeId: string, deviceUdid: string) {
    await this.executeSync(() => {
      if (this.nodeMap.has(nodeId)) {
        this.nodeMap.get(nodeId)?.removeDevice(deviceUdid);
        log.info(`Removing device with id ${deviceUdid} from node ${nodeId}`);
        log.info(`Total device available in node ${nodeId} : ${this.nodeMap.get(nodeId)?.getDevices().length}`);
      }
    });
  }

  public async blockDevice(nodeId: string, blockInfo: { deviceUdid: string; sessionId?: string }) {
    await this.executeSync(() => {
      if (this.nodeMap.has(nodeId)) {
        const { deviceUdid, sessionId } = blockInfo;
        this.nodeMap.get(nodeId)?.blockDevice(deviceUdid, sessionId);
        log.info(`Blocking device with id ${deviceUdid} in node ${nodeId}`);
      }
    });
  }

  public async UnblockDevice(nodeId: string, deviceUdid: string) {
    await this.executeSync(() => {
      if (this.nodeMap.has(nodeId)) {
        this.nodeMap.get(nodeId)?.unBlockDevice(deviceUdid);
        log.info(`UnBlocking device with id ${deviceUdid} in node ${nodeId}`);
      }
    });
  }

  public async updateSessions(nodeId: string, sessions: Array<string>) {
    await this.executeSync(() => {
      if (this.nodeMap.has(nodeId)) {
        this.nodeMap.get(nodeId)?.setSessions(sessions);
      }
    });
  }

  public async deviceControlStarted(nodeId: string, deviceId: string, userId: number) {
    await this.executeSync(() => {
      const node = this.nodeMap.get(nodeId);
      if (node) {
        const device = node.getDeviceById(deviceId);
        if (device) {
          device.controlStarted(userId);
        }
      }
    });
  }

  public async deviceControlStopped(nodeId: string, deviceId: string) {
    await this.executeSync(() => {
      const node = this.nodeMap.get(nodeId);
      if (node) {
        const device = node.getDeviceById(deviceId);
        if (device) {
          log.info(`Stopping control for device with id ${deviceId} in node ${nodeId}`);
          device.controlStopped();
        }
      }
    });
  }

  private async executeSync(fn: () => any | Promise<any>) {
    return await this.asyncLock.execute(fn.bind(this));
  }

  public getStreamController(nodeId: string) {
    return this.controllerMap.get(nodeId)?.streamController;
  }
}
