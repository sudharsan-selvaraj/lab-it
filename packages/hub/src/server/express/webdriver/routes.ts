import { Router } from "express";
import { NodeManager } from "src/nodes/node-manager";
import { Distributor } from "../../../automation/distributor";
import { SessionManager } from "../../../nodes/session-manager";
import { WdController } from "../webdriver/controllers/wd-controller";
import { fixPythonContentType } from "./middlewares";

function addMiddlewares(router: Router) {
  router.use(fixPythonContentType);
}

export function getRouter(distributor: Distributor, sessionManager: SessionManager, nodeManager: NodeManager) {
  const router: Router = Router();

  const controller = new WdController(sessionManager, distributor, nodeManager);
  controller.initializeRoutes(router, router);

  addMiddlewares(router);
  return router;
}
