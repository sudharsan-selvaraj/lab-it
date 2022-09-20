import { SocketController } from "appium-grid-socket";

class BaseController extends SocketController {
  protected getNodeId() {
    return this.getMetadataValue("nodeId");
  }

  protected getNodeName() {
    return this.getMetadataValue("nodeName");
  }

  protected getIp() {
    return this.getMetadataValue("ip");
  }

  protected getHostName() {
    return this.getMetadataValue("hostname");
  }

  protected getAppiumPort() {
    return this.getMetadataValue("appiumPort");
  }
}

export { BaseController };
