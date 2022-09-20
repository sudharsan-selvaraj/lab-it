import { NextFunction, Request, Response, Router } from "express";
import { StatusCodes } from "http-status-codes";
import _ from "lodash";
import { Distributor } from "../../../../automation/distributor";
import { SessionManager } from "../../../../nodes/session-manager";
import { Controllers } from "appium-grid-api-commons";
import { WdSession } from "../../../../nodes/wd-session";
import { routeToCommandName } from "appium-base-driver";
import { isWdResponseSuccess } from "appium-grid-common";
import { NodeManager } from "../../../../nodes/node-manager";

export class WdController extends Controllers.ApiController {
  constructor(
    private sessionManager: SessionManager,
    private distributor: Distributor,
    private nodeManager: NodeManager
  ) {
    super();
  }

  initializeRoutes(protectedRoute: Router, unProtectedRoute: Router): void {
    protectedRoute.get("/status", this.status.bind(this));
    protectedRoute.post("/session", this.handleNewSession.bind(this));
    protectedRoute.use("/session/:sessionId", [this.sessionGaurd.bind(this), this.proxyReqRes.bind(this)]);
  }

  // Middleware
  private sessionGaurd(request: Request, response: Response, next: NextFunction) {
    const sessionId: string = request.params.sessionId;

    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      return response.status(StatusCodes.NOT_FOUND).json({
        value: {
          error: "invalid session id",
          message: `Session ${sessionId} is either terminated or not started`,
          sessionId,
        },
      });
    }

    const node = this.nodeManager.getNodeById(session.getNodeId());
    if (!node || !node.getIsActive()) {
      return response.status(StatusCodes.NOT_FOUND).json({
        status: StatusCodes.NOT_FOUND,
        sessionId,
        value: {
          error: "node not found",
          message: `Node ${!!node ? node?.getId() : ""} is inactive or node found`,
        },
      });
    }
    next();
  }

  async status(request: Request, response: Response, next: NextFunction) {
    return response.status(200).json({
      value: { success: true },
    });
  }

  async handleNewSession(request: Request, response: Response, next: NextFunction) {
    try {
      const wdResponse = await this.distributor.createNewSession(
        {
          wdProxyRequest: {
            url: request.path,
            body: {},
            queryParam: request.query as any,
            headers: request.headers as any,
            method: request.method as any,
          },
          capabilities: request.body,
        },
        request
      );

      if (_.isBoolean(wdResponse)) {
        return;
      }
      return response.status(wdResponse.status).json(wdResponse.response);
    } catch (err) {
      response.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        value: {
          error: "unknown error",
          message: err instanceof Error ? err.message : err,
          stacktrace: err instanceof Error ? err.stack : undefined,
        },
      });
    }
  }

  async proxyReqRes(request: Request, response: Response, next: NextFunction) {
    const sessionId: string = request.params.sessionId;
    const session = this.sessionManager.getSession(sessionId) as WdSession;
    const node = this.nodeManager.getNodeById(session.getNodeId()) as any;
    const commandName = routeToCommandName(request.path, request.method);

    const wdResponse = await node.getWdProxy().call({
      url: `/session/${sessionId}${request.path}`,
      body: request.body,
      queryParam: request.query as any,
      headers: request.headers as any,
      method: request.method as any,
    });

    if (commandName == "deleteSession") {
      if (isWdResponseSuccess(wdResponse)) {
        session.setCompleted(true);
      }
      await this.nodeManager.UnblockDevice(session.getNodeId(), session.getDeviceId());
    }

    return response.status(wdResponse.status).json(wdResponse.response);
  }
}
