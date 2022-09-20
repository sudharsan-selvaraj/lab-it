import { SocketController, SocketService } from "appium-grid-socket";
import { Namespace, Socket } from "socket.io";
import { Dependencies } from "../../../../constants";
import Container, { Inject, Service } from "typedi";
import { WebClientSocketAuthenticator } from "./authenticator";
import { EventController } from "./event-controller";

@Service()
class WebClientSocketService extends SocketService {
  private controllers: Array<typeof SocketController> = [EventController];
  private webClientAutenticator: WebClientSocketAuthenticator;

  constructor(@Inject(Dependencies.SOCKET_WEB_CLIENT_NAMESPACE) io: Socket | Namespace) {
    super(io);
    this.webClientAutenticator = Container.get(WebClientSocketAuthenticator);
    //io.use(this.webClientAutenticator.authentiate.bind(this.webClientAutenticator));
  }

  onConnection(socket: Socket) {
    const metaMap = new Map();
    this.controllers.forEach((controller) => {
      new controller(socket, metaMap);
    });
  }
}

export { WebClientSocketService };
