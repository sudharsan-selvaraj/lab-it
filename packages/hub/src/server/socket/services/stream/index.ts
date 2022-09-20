import { SocketController, SocketService } from "appium-grid-socket";
import { Namespace, Socket } from "socket.io";
import { Dependencies } from "../../../../constants";
import Container, { Inject, Service } from "typedi";
import { WebClientSocketAuthenticator } from "./authenticator";
import { StreamController } from "./stream-controller";
const uuid = require("uuid-by-string");

@Service()
class StreamSocketService extends SocketService {
  private controllers: Array<typeof SocketController> = [StreamController];
  private webClientAutenticator: WebClientSocketAuthenticator;

  constructor(@Inject(Dependencies.SOCKET_STREAM_NAMESPACE) io: Socket | Namespace) {
    super(io);
    this.webClientAutenticator = Container.get(WebClientSocketAuthenticator);
    io.use(this.webClientAutenticator.authentiate.bind(this.webClientAutenticator));
  }

  onConnection(socket: Socket) {
    const { nodeId, deviceId } = socket.handshake.query;
    const metadata = {
      nodeId: nodeId,
      deviceId: deviceId,
    };
    const metaMap = new Map(Object.entries(metadata));
    this.controllers.forEach((controller) => {
      new controller(socket, metaMap);
    });
  }
}

export { StreamSocketService };
