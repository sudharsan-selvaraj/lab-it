import { Controllers } from "appium-grid-api-commons";
import { Router } from "express";
import Container from "typedi";
import cookieParser from "cookie-parser";

import * as ApiControllers from "../api/controllers";
import { verifyJwtToken } from "./middlewares";

export default function getApiRouter() {
  const router: Router = Router();

  router.use(cookieParser());

  // prettier-ignore
  const controllers: [string, Controllers.ApiController][] = [
    ["/auth", Container.get(ApiControllers.AuthController)]
  ];

  for (let [path, controller] of controllers) {
    const [protectedRoute, unProtectedRoute, tokenRouter] = new Array(3).fill(Router).map((f) => f());
    protectedRoute.use(verifyJwtToken);

    /* pass the routed to the controller which will map the internal routes with corresponding methods */
    controller.initializeRoutes(protectedRoute, tokenRouter, unProtectedRoute);
    [unProtectedRoute, tokenRouter, protectedRoute].forEach((route) => router.use(path, route));
  }

  return router;
}
