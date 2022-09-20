#!/usr/bin/env node

import "reflect-metadata";
import "./bootstrap";
import http from "http";
import { ExpressApp } from "./server/express/app";
import { SocketServer } from "./server/socket";
import Container from "typedi";
import { Dependencies } from "./constants";
import { Distributor } from "./automation/distributor";
import { SessionManager } from "./nodes/session-manager";
import { log } from "appium-grid-logger";
import { loadDatabase } from "./db/loader";
import { Configuration } from "./config";
import { NodeManager } from "./nodes/node-manager";

async function bootstrap() {
  const config = Container.get(Dependencies.CONFIGURATION) as Configuration;
  const appiumConfig = config.appium;

  log.info(`Starting appium server with configuration\n` + JSON.stringify(appiumConfig, null, 2));

  log.info(`Loading database from ` + config.database.uri);
  await loadDatabase(config);

  const distributor = Container.get(Dependencies.DISTRIBUTOR) as Distributor;
  const sessionManager = Container.get(Dependencies.SESSION_MANAGER) as SessionManager;
  const nodeManager = Container.get(Dependencies.NODE_MANAGER) as NodeManager;

  const app = ExpressApp(config, distributor, sessionManager, nodeManager);
  const httpServer = http.createServer(app);
  SocketServer.initialize(httpServer);

  httpServer.listen(appiumConfig.port, appiumConfig.address, () => {
    log.info(`Appium grid server started on http://${appiumConfig.address || "0.0.0.0"}:${appiumConfig.port}`);
  });
}

bootstrap();
