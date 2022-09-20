import { BasePluginController } from "../base-plugin-controller";
import { NewSessionMessage } from "appium-grid-common";
import { PluginEvents } from "../../contants";
import { getLogger } from "appium-grid-logger";

const log = getLogger("AppiumNodeSessionController");

export class SessionController extends BasePluginController {
  protected initialize(): void {
    super.initialize();

    this.onPluginEvent(PluginEvents.NEW_SESSION, this.onNewSessionCreated.bind(this));
  }

  private onNewSessionCreated(message: NewSessionMessage) {
    log.info(`Sending notification to hub about new session creation. Session Id: ${message.response.sessionId}`);
    this.sendMessage<NewSessionMessage>("session:new", message);
  }
}
