import { DecoratedSocket, SocketController } from "appium-grid-socket";
import { Dependencies } from "../contants";
import { EventEmitter } from "stream";
import Container from "typedi";

class BasePluginController extends SocketController {
  private pluginEventEmitter!: EventEmitter;
  private socketEventEmitter!: EventEmitter;

  protected initialize() {
    this.pluginEventEmitter = Container.get(Dependencies.PLUGIN_EVENT_EMITTER);
    this.socketEventEmitter = Container.get(Dependencies.SOCKET_EVENT_EMITTER);
  }

  emit(event: string, message?: any) {
    this.socketEventEmitter.emit(event, message);
  }

  onPluginEvent(eventName: string, cb: (value?: any) => any) {
    this.pluginEventEmitter.on(eventName, cb);
  }
}
export { BasePluginController };
