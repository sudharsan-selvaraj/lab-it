import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import { Configuration } from "../../config";
import { fixPythonContentType } from "./webdriver/middlewares";
import { Distributor } from "../../automation/distributor";
import { SessionManager } from "../../nodes/session-manager";
import { NodeManager } from "../../nodes/node-manager";
import getApiRouter from "./api/routes";
import { getRouter } from "./webdriver/routes";
import { catchAllHandler } from "./middlewares";
import path from "path";

const PUBLIC_DIRECTORY = path.join(__dirname, "../../../public");

const addRoutes = (
  app: express.Application,
  config: Configuration,
  distributor: Distributor,
  sessionManager: SessionManager,
  nodeManager: NodeManager
) => {
  const wdRoute = getRouter(distributor, sessionManager, nodeManager);
  app.use(config.appium.basePath, wdRoute);

  const apiRoutes = getApiRouter();
  app.use(config.express.baseApiRoute, apiRoutes);
};

const addMiddlewares = (app: express.Application, config: Configuration) => {
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  if (config.appium.allowCors) {
    app.use(cors());
  }
};

export const ExpressApp = (
  config: Configuration,
  distributor: Distributor,
  sessionManager: SessionManager,
  nodeManager: NodeManager
) => {
  const app = express();

  addMiddlewares(app, config);
  addRoutes(app, config, distributor, sessionManager, nodeManager);

  app.use(express.static(PUBLIC_DIRECTORY));
  app.get("*", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(200).sendFile(path.join(PUBLIC_DIRECTORY, "index.html"));
  });

  app.use(catchAllHandler);

  return app;
};
