import { SocketController, SocketService } from "appium-grid-socket";
import { Namespace, Socket } from "socket.io";
import { Dependencies } from "../../../../constants";
import Container, { Inject, Service } from "typedi";
import { HubSocketAuthenticator } from "./authenticator";
import { DeviceController } from "./controllers/device-controller";
import { NodeController } from "./controllers/node-controller";
import { SessionController } from "./controllers/session-controller";
import { getCountryDetailsFromTimeZone } from "../../../../utils";
import _ from "lodash";
const uuid = require("uuid-by-string");

@Service()
class HubSocketService extends SocketService {
  private controllers: Array<typeof SocketController> = [NodeController, SessionController, DeviceController];

  private hubSocketAutenticator: HubSocketAuthenticator;

  constructor(@Inject(Dependencies.SOCKET_HUB_NAMESPACE) io: Socket | Namespace) {
    super(io);
    this.hubSocketAutenticator = Container.get(HubSocketAuthenticator);
    io.use(this.hubSocketAutenticator.authentiate.bind(this.hubSocketAutenticator));
  }

  onConnection(socket: Socket) {
    const { hostname, appiumPort, nodeHost, nodeName, timeZone } = socket.handshake.query;
    const nodeId = uuid(`${hostname}:${appiumPort}`);

    const metadata = {
      nodeId: nodeId,
      hostname: hostname,
      appiumPort: appiumPort,
      ip: !_.isNil(nodeHost) && nodeHost != "undefined" ? nodeHost : socket.handshake.headers["x-forwarded-for"],
      nodeName: nodeName || nodeId,
      ...getCountryDetailsFromTimeZone(timeZone as string),
    };

    const metaMap = new Map(Object.entries(metadata));
    this.controllers.forEach((controller) => {
      new controller(socket, metaMap);
    });
  }
}

export { HubSocketService };
