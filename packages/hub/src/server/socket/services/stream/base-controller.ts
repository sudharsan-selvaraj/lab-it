import { SocketController } from "appium-grid-socket";
import { Users } from "../../../../db/models";
const uuid = require("uuid-by-string");

export class BaseController extends SocketController {
  protected getNodeId() {
    return this.getMetadataValue("nodeId");
  }

  protected getDeviceId() {
    return this.getMetadataValue("deviceId");
  }

  protected getStreamChannelId() {
    return uuid(`stream:${this.getNodeId()}:${this.getDeviceId()}`);
  }

  protected getControlChannelId() {
    return uuid(`control:${this.getNodeId()}:${this.getDeviceId()}`);
  }

  protected getCurrentUser(): Users {
    return this.getSocket().data.user as Users;
  }

  
}
