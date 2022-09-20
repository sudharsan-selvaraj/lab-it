import { SocketProxyMessage, WebClientInitialInfoMessage, WebClientSocketMessageEvent } from "appium-grid-common";
import Container from "typedi";
import { NodeService } from "../../../../services/node/node-service";
import { BaseController } from "./base-controller";

export class EventController extends BaseController {
  private nodeService!: NodeService;

  protected initialize(): void {
    this.nodeService = Container.get(NodeService);
    this.onMessage(WebClientSocketMessageEvent.CLIENT_READY, this.sendNodeAndDeviceDetails.bind(this));
  }

  private async sendNodeAndDeviceDetails() {
    const nodes = await this.nodeService.getAllNodes(true);
    this.sendMessage<WebClientInitialInfoMessage>(WebClientSocketMessageEvent.INITIAL_INFO, {
      nodes: nodes.filter((node) => node.isActive) as any,
    });
  }
}
