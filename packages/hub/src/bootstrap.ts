import Container from "typedi";
import { Dependencies } from "./constants";
import { Distributor } from "./automation/distributor";
import { NodeManager } from "./nodes/node-manager";
import config from "./config";
import { SessionManager } from "./nodes/session-manager";

const nodeManager = new NodeManager();
const sessionManager = new SessionManager();

Container.set(Dependencies.NODE_MANAGER, nodeManager);
Container.set(Dependencies.DISTRIBUTOR, new Distributor(sessionManager, nodeManager));
Container.set(Dependencies.SESSION_MANAGER, sessionManager);
Container.set(Dependencies.CONFIGURATION, config);
