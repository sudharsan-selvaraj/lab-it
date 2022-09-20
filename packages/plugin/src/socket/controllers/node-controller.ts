import { NodeRegisterMessage, SocketMessageEvent } from "appium-grid-common";
import { Dependencies, PluginEvents, SocketEvents } from "../../contants";
import { BasePluginController } from "../base-plugin-controller";
import { getLogger } from "appium-grid-logger";
import { IDeviceRepository } from "../../types";
import Container from "typedi";

const log = getLogger("AppiumNodeController");

/**
 * Manages new socket connection from appium node plugin
 */
export class NodeController extends BasePluginController {
  private deviceRepository!: IDeviceRepository;

  protected initialize(): void {
    super.initialize();
    this.deviceRepository = Container.get(Dependencies.DEVICE_MANAGER);

    this.onPluginEvent(PluginEvents.REGISTER_NODE, this.registerNode.bind(this));
  }

  private registerNode() {
    this.sendMessage<NodeRegisterMessage>(SocketMessageEvent.NODE_REGISTER, {
      devices: this.deviceRepository.getDevices(),
    });
    log.info(`Successfully resgisterd node to grid`);
    this.emit(SocketEvents.NODE_REGISTERED);
  }
}
