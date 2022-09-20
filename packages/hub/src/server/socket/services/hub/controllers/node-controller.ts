import {
  Device,
  GridDevice,
  NodeRegisterMessage,
  NodeSessionsUpdateMessage,
  SocketMessage,
  SocketMessageEvent,
} from "appium-grid-common";
import { Dependencies } from "../../../../../constants";
import Container from "typedi";
import { Node } from "../../../../../nodes/node";
import { NodeManager } from "../../../../../nodes/node-manager";
import { BaseController } from "../base-controller";
import { getLogger } from "appium-grid-logger";
import { ExecutionController } from "./execution-controller";
import { RemoteStreamController } from "./proxy/remote-stream-controller";

const log = getLogger("SocketNodeController");

class NodeController extends BaseController {
  private nodeManager: NodeManager = Container.get(Dependencies.NODE_MANAGER);

  protected initialize(): void {
    this.onMessage(SocketMessageEvent.NODE_REGISTER, this.registerNewNode.bind(this));
    this.onMessage("node:sessions", this.updateSessions.bind(this));

    this.onSocketEvent("disconnect", () => {
      this.makeNodeInactive();
    });
  }

  private async registerNewNode(event: string, message: SocketMessage<NodeRegisterMessage>) {
    const { devices } = message.data;
    log.info(
      `Got new request to resiger a node with id: ${this.getNodeId()} ,
       Host Name: ${this.getHostName()} , Appium Port : ${this.getAppiumPort()}`
    );

    const deviceMap = devices?.reduce((map: Map<string, GridDevice>, d: any) => {
      return map.set(d.udid, new GridDevice(new Device({ ...d }), this.getNodeId()));
    }, new Map());

    const node = new Node({
      id: this.getNodeId(),
      name: this.getNodeName(),
      host: this.getHostName(),
      port: this.getAppiumPort(),
      ip: this.getIp(),
      isActive: true,
      devices: deviceMap,
      countryCode: this.getMetadataValue("countryCode"),
      countryName: this.getMetadataValue("countryName"),
      wdProxy: new ExecutionController(this.getSocket(), this.getMetadata()),
    });

    this.nodeManager.addNode(node, {
      streamController: new RemoteStreamController(this.getSocket(), this.getMetadata()),
    });
  }

  private async updateSessions(event: string, message: SocketMessage<NodeSessionsUpdateMessage>) {
    const { sessions } = message.data;
    this.nodeManager.updateSessions(this.getNodeId(), sessions);
  }

  private async makeNodeInactive() {
    this.nodeManager.setNodeOffline(this.getNodeId());
  }
}

export { NodeController };
