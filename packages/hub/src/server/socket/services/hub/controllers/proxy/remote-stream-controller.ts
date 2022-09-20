import {
  SocketMessage,
  SocketMessageEvent,
  SocketProxyMessage,
  StreamStartMessage,
  StreamStopMessage,
} from "appium-grid-common";
import { BaseController } from "../../base-controller";
import { INodeDeviceStreamController } from "../../../../../../types";
import { getLogger } from "appium-grid-logger";
import Container from "typedi";
import { Dependencies } from "../../../../../../constants";
import _ from "lodash";

const uuid = require("uuid-by-string");

const log = getLogger("RemoteDeviceController");

const BroadCastCommandList = {
  [SocketMessageEvent.STREAM_DEVICE_INFO]: { onlyToRoom: true },
  [SocketMessageEvent.STREAM_IMAGE]: { onlyToRoom: true },
  [SocketMessageEvent.DEVICE_SYS_LOG]: { onlyToRoom: true },
  [SocketMessageEvent.DEVICE_SHELL_LOG]: { onlyToRoom: true },
  [SocketMessageEvent.DEVICE_INSTALL_APP_STARTED]: { onlyToRoom: true },
  [SocketMessageEvent.DEVICE_INSTALL_APP_COMPLETED]: { onlyToRoom: true },
  [SocketMessageEvent.STREAM_CONTROL_INFO]: { onlyToRoom: false },
};

class RemoteStreamController extends BaseController implements INodeDeviceStreamController {
  private streamSocketNamespace!: SocketIO.Server | SocketIO.Namespace;

  protected initialize(): void {
    this.streamSocketNamespace = Container.get(Dependencies.SOCKET_STREAM_NAMESPACE);
    Object.keys(BroadCastCommandList).forEach((command) =>
      this.onMessage(command, this.broadcastToStreamClients.bind(this))
    );
  }

  private getStreamRoomId(deviceId: string) {
    return uuid(`stream:${this.getNodeId()}:${deviceId}`);
  }

  public startStreaming(deviceUdid: string, startControl: boolean, socket: SocketIO.Socket) {
    log.info(`Starting remote device streaming for device ${deviceUdid}`);
    socket.join(this.getStreamRoomId(deviceUdid));
    this.sendMessage<StreamStartMessage>(SocketMessageEvent.STREAM_START, {
      deviceUdid: deviceUdid,
      startControl,
    });
  }

  public stopStreaming(deviceUdid: string) {
    log.info(`Stoppping remote device streaming for device ${deviceUdid}`);
    this.sendMessage<StreamStopMessage>(SocketMessageEvent.STREAM_STOP, {
      deviceUdid: deviceUdid,
    });
  }

  public proxyMessage<T>(event: string, message: SocketMessage<T>) {
    this.getSocket().emit(event, message);
  }

  private broadcastToStreamClients(event: string, message: SocketMessage<SocketProxyMessage>) {
    const command = BroadCastCommandList[event];
    if (!command) {
      return;
    }
    if (command.onlyToRoom) {
      const room = this.getStreamRoomId(message.data.deviceUdid);
      this.streamSocketNamespace.to(room).emit(event, message);
    } else {
      this.streamSocketNamespace.emit(event, message);
    }
  }
}

export { RemoteStreamController };
