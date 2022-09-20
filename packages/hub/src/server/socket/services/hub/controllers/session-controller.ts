import { NewSessionMessage, SocketMessage } from "appium-grid-common";
import { Dependencies } from "../../../../../constants";
import Container from "typedi";
import { BaseController } from "../base-controller";
import { getLogger } from "appium-grid-logger";
import { SessionManager } from "../../../../../nodes/session-manager";
import { WdSession } from "../../../../../nodes/wd-session";
import { NodeManager } from "src/nodes/node-manager";

const log = getLogger("NodeSocketController");

class SessionController extends BaseController {
  private sessionManager: SessionManager = Container.get(Dependencies.SESSION_MANAGER);
  private nodeManager: NodeManager = Container.get(Dependencies.NODE_MANAGER) as NodeManager;

  protected initialize(): void {
    this.onMessage("session:new", this.onNewSession.bind(this));
  }

  private async onNewSession(event: string, message: SocketMessage<NewSessionMessage>) {
    const { rawCapabilities, response } = message.data;
    const wdSession = new WdSession({
      sessionId: response.sessionId,
      nodeId: this.getNodeId(),
      completed: false,
      deviceId: response.capabilities["udid"],
    });
    this.sessionManager.addSession(response.sessionId, wdSession);
    await this.nodeManager.blockDevice(wdSession.getNodeId(), {
      deviceUdid: wdSession.getDeviceId(),
      sessionId: wdSession.getSessionId(),
    });
    log.info(`New session created in node ${this.getNodeName()} with session id [${response.sessionId}]`);
  }
}

export { SessionController };
