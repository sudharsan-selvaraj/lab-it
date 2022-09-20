import { Server as SocketIoServer } from "socket.io";
import { Server as HttpServer } from "http";
import { HubSocketService } from "./services/hub";
import { StreamSocketService } from "./services/stream";
import Container from "typedi";
import { Dependencies } from "../../constants";
import { WebClientSocketService } from "./services/web";

export class SocketServer {
  private static instance: SocketServer;
  private io: SocketIoServer;

  private hubService!: HubSocketService;
  private streamService!: StreamSocketService;
  private webClientService!: WebClientSocketService;

  private constructor(httpServer: HttpServer) {
    this.io = new SocketIoServer(httpServer, {
      maxHttpBufferSize: 1e8,
      cors: {
        origin: "*",
      },
    });
    this.configure();
  }

  private configure() {
    Container.set(Dependencies.SOCKET_HUB_NAMESPACE, this.io.of("/hub"));
    Container.set(Dependencies.SOCKET_STREAM_NAMESPACE, this.io.of("/stream"));
    Container.set(Dependencies.SOCKET_WEB_CLIENT_NAMESPACE, this.io.of("/web"));
    this.hubService = Container.get(HubSocketService);
    this.streamService = Container.get(StreamSocketService);
    this.webClientService = Container.get(WebClientSocketService);
  }

  public static initialize(httpServer: HttpServer) {
    if (!SocketServer.instance) {
      return new SocketServer(httpServer);
    }
  }
}
