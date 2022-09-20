import {
  SocketMessage,
  SocketMessageEvent,
  SocketProxyMessage,
  StreamNotAvailableMessage,
  StreamStartMessage,
} from "appium-grid-common";
import { getLogger } from "appium-grid-logger";
import { Socket } from "socket.io";
import { Dependencies } from "../../../../constants";
import { NodeManager } from "../../../../nodes/node-manager";
import Container from "typedi";
import { BaseController } from "./base-controller";
import { ExecuteLock } from "appium-grid-common";
import _ from "lodash";

const log = getLogger("NodeSocketController");
const asyncLock = new ExecuteLock("StreamDeviceClientLock");

class StreamController extends BaseController {
  private nodeManager!: NodeManager;

  protected initialize(): void {
    this.nodeManager = Container.get(Dependencies.NODE_MANAGER);
    this.onMessage(SocketMessageEvent.STREAM_START, this.onStartStream.bind(this));
    this.registerProxyControlCommands([
      {
        event: SocketMessageEvent.GET_DEVICE_CONTROL_INFO,
        gaurd: false,
      },
      ...[
        SocketMessageEvent.DEVICE_RUN_SHELL_COMMAND,
        SocketMessageEvent.DEVICE_CONTROL_COMMAND,
        SocketMessageEvent.DEVICE_START_LOGS,
        SocketMessageEvent.DEVICE_STOP_LOGS,
        SocketMessageEvent.DEVICE_START_SHELL,
        SocketMessageEvent.DEVICE_STOP_SHELL,
        SocketMessageEvent.DEVICE_INSTALL_APP,
      ].map((c) => ({
        event: c,
        gaurd: true,
      })),
    ]);

    this.onSocketEvent("disconnect", async () => {
      await asyncLock.execute(async () => {
        const socket = this.getSocket();
        if (socket instanceof Socket) {
          const socketsInRoom = await socket.in(this.getStreamChannelId()).allSockets();
          log.info(`Total client connect in room ${this.getNodeId()}:${this.getDeviceId()} : ` + socketsInRoom.size);
          if (socketsInRoom.size <= 0) {
            await this.stopStream();
          }
        }
      });
    });
  }

  private async onStartStream(event: string, message: SocketMessage<StreamStartMessage>) {
    const { startControl } = message.data;
    const deviceId = this.getDeviceId();
    const nodeId = this.getNodeId();

    const node = this.nodeManager.getNodeById(nodeId);
    const device = node?.getDeviceById(this.getDeviceId());
    const currentUser = this.getCurrentUser();
    const deviceController = this.nodeManager.getStreamController(nodeId);

    await asyncLock.execute(async () => {
      if (!node?.getIsActive() || !device || !deviceController) {
        return this.sendMessage<StreamNotAvailableMessage>(SocketMessageEvent.STREAM_NOT_AVAILABLE, {
          deviceUdid: this.getDeviceId(),
          reason: "Node or device not found",
        });
      }

      if (startControl) {
        if (_.isNull(device.getActiveControllUserId())) {
          this.nodeManager.deviceControlStarted(node.getId(), device.getUdid(), currentUser.id);
        } else {
          return this.sendMessage<StreamNotAvailableMessage>(SocketMessageEvent.STREAM_NOT_AVAILABLE, {
            deviceUdid: this.getDeviceId(),
            reason: "Device is currently used by " + currentUser.username,
          });
        }
      }
      deviceController.startStreaming(deviceId, startControl, this.getSocket() as SocketIO.Socket);
    });
  }

  private async stopStream() {
    const deviceId = this.getDeviceId();
    const nodeId = this.getNodeId();

    const node = this.nodeManager.getNodeById(nodeId);
    const deviceController = this.nodeManager.getStreamController(nodeId);
    if (node?.getIsActive() && deviceController) {
      deviceController.stopStreaming(deviceId);
      await this.nodeManager.deviceControlStopped(node.getId(), deviceId);
    }
  }

  private registerProxyControlCommands(proxyCommands: Array<{ event: string; gaurd: boolean }>) {
    proxyCommands.forEach((commandInfo) => {
      const { event: command, gaurd } = commandInfo;
      this.onMessage(command, async (event: string, message: SocketMessage<SocketProxyMessage>) => {
        const node = this.nodeManager.getNodeById(this.getNodeId());
        if (!node) {
          return;
        }

        const device = node.getDeviceById(this.getDeviceId());
        const proxyController = this.nodeManager.getStreamController(node.getId());

        if (!gaurd || device?.getActiveControllUserId() == this.getCurrentUser()?.id) {
          if (!message.data) {
            message = {
              data: {},
            } as any;
          }
          message.data.deviceUdid = this.getDeviceId();
          proxyController?.proxyMessage(event, message);
        }
      });
    });
  }
}

export { StreamController };
