import {
  BlockDeviceMessage,
  Device,
  GridDevice,
  NodeDeviceConnectMessage,
  NodeDeviceDisconnectMessage,
  SocketMessage,
  SocketMessageEvent,
  UnBlockDeviceMessage,
} from "appium-grid-common";
import { Dependencies } from "../../../../../constants";
import Container from "typedi";
import { BaseController } from "../base-controller";
import { getLogger } from "appium-grid-logger";
import { NodeManager } from "src/nodes/node-manager";
import _ from "lodash";

const log = getLogger("NodeDeviceController");

class DeviceController extends BaseController {
  private nodeManager!: NodeManager;

  protected initialize(): void {
    this.nodeManager = Container.get(Dependencies.NODE_MANAGER);

    this.onMessage(SocketMessageEvent.DEVICE_CONNECTED, this.onNewDeviceConnected.bind(this));
    this.onMessage(SocketMessageEvent.DEVICE_DISCONNECTED, this.onDeviceDisconnected.bind(this));
    this.onMessage(SocketMessageEvent.DEVICE_BLOCK, this.blockDevice.bind(this));
    this.onMessage(SocketMessageEvent.DEVICE_UNBLOCK, this.UnblockDevice.bind(this));
  }

  private async onNewDeviceConnected(event: string, message: SocketMessage<NodeDeviceConnectMessage>) {
    const { device } = message.data;
    const deviceInstance = new GridDevice({ ...device } as any, this.getNodeId());
    log.info(`New device connected to node ${this.getNodeName()}`);
    this.nodeManager.addDeviceToNode(this.getNodeId(), deviceInstance);
  }

  private async onDeviceDisconnected(event: string, message: SocketMessage<NodeDeviceDisconnectMessage>) {
    const { deviceUdid } = message.data;

    log.info(`Device ${deviceUdid} disconnected from node ${this.getNodeName()}`);
    this.nodeManager.deleteDeviceInNode(this.getNodeId(), deviceUdid);
  }

  private async blockDevice(event: string, message: SocketMessage<BlockDeviceMessage>) {
    const { deviceUdid, sessionId } = message.data;
    log.info(
      `Blocking ${deviceUdid} in node ${this.getNodeId()} ${!_.isNil(sessionId) ? " for session " + sessionId : ""}`
    );
    this.nodeManager.blockDevice(this.getNodeId(), {
      deviceUdid,
      sessionId,
    });
  }

  private async UnblockDevice(event: string, message: SocketMessage<UnBlockDeviceMessage>) {
    const { deviceUdid } = message.data;
    log.info(`UnBlocking ${deviceUdid} from node ${this.getNodeId()}`);
    this.nodeManager.UnblockDevice(this.getNodeId(), deviceUdid);
  }
}

export { DeviceController };
