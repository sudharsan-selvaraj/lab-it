import { io, Socket } from "socket.io-client";
import { EventEmitter } from "events";
import { Container } from "typedi";
import { Dependencies, PluginEvents } from "../contants";
import { NodeController } from "./controllers/node-controller";
import { Configuration } from "../config";
import { CommandController } from "./controllers/command-controller";
import { getLogger } from "appium-grid-logger";
import { SessionController } from "./controllers/session-controller";
import { DeviceController } from "./controllers/device-controller";
import { StreamController } from "./controllers/stream-controller";
import * as URL from "url";
import { getTimeZone } from "../utils/common";

const log = getLogger("AppiumNodeSocketManager");

const SOCKET_HUB_NAMESPACE = "hub";

class SocketClient {
  private static instance: SocketClient;
  private pluginEventEmitter!: EventEmitter;
  private config!: Configuration;
  private io!: Socket;
  private isAlreadyConnected: boolean = false;

  private constructor(private opts: { host: string; port: number }) {
    this.pluginEventEmitter = Container.get(Dependencies.PLUGIN_EVENT_EMITTER);
    this.config = Container.get(Dependencies.CONFIGURATION);
    this.pluginEventEmitter.on(PluginEvents.APPIUM_SERVER_STARTED, this.connectToSocketServer.bind(this));
  }

  public static initialize(opts: { host: string; port: number }) {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient(opts);
    }
    return SocketClient.instance;
  }

  private static getWebSocketUrl(urlString: string) {
    const url = URL.parse(urlString);

    return `${url.protocol?.startsWith("https") ? "wss://" : "ws://"}${url.host}/${SOCKET_HUB_NAMESPACE}`;
  }

  async connectToSocketServer() {
    const { host, port } = this.opts;
    const socketUrl = SocketClient.getWebSocketUrl(
      `${!host.startsWith("http") ? "http://" : ""}${host}${port ? ":" + port : ""}`
    );
    log.info(`Appium server is started. Registering node to appium grid in ${socketUrl}`);
    const query = {
      hostname: this.config.hostname,
      appiumPort: this.config.appiumPort,
      nodeHost: this.config.nodeHost,
      token: this.config.apiKey,
      timeZone: getTimeZone(),
    };

    this.io = io(socketUrl, {
      transports: ["websocket", "polling"],
      query: query,
      forceNew: true,
      reconnection: true,
    });

    this.io.on("connect", this.onConnectionSuccess.bind(this));
    this.io.on("connect_error", this.onConnectionError.bind(this));
  }

  onSocketReconnected() {
    log.info(`Node is successfully reconnected to grid again`);
    this.pluginEventEmitter.emit(PluginEvents.SOCKET_RECONNECTED);
    this.pluginEventEmitter.emit(PluginEvents.REGISTER_NODE);
  }

  onConnectionSuccess() {
    if (this.isAlreadyConnected) {
      return this.onSocketReconnected();
    }
    log.info(`Node is now connected to the appium grid server`);
    this.isAlreadyConnected = true;
    this.loadControllers();
    /* Emit event to resgister the node */
    this.pluginEventEmitter.emit(PluginEvents.REGISTER_NODE);
  }

  loadControllers() {
    new NodeController(this.io);
    new CommandController(this.io, new Map(), Container.get(Dependencies.PROXY_WEBDRIVER));
    new SessionController(this.io);
    new DeviceController(this.io);
    new StreamController(this.io);
  }

  onConnectionError(err: Error) {
    log.info(`Unable to connect node to server`);
    log.error(err);
  }
}

export { SocketClient };
