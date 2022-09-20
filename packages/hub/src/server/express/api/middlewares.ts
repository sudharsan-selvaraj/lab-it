import { NextFunction, Request, Response } from "express";
import { AuthService } from "../../../services/auth/auth-service";
import Container from "typedi";
import { ApiErrors } from "appium-grid-api-commons";

export const verifyJwtToken = async function (request: Request, response: Response, next: NextFunction) {
  const authService = Container.get(AuthService);

  let accessTokenKey = "X-Access-Token".toLowerCase(),
    token =
      request.body.token ||
      request.query.token ||
      request.headers["authorization"] ||
      request.headers[accessTokenKey] ||
      request.query["auth-access-token"];

  if (token) {
    try {
      let userInfo = await authService.verifyJwtToken(token.replace("Bearer", "").trim());
      if (!userInfo) {
        next(new ApiErrors.APIError(401, "Invalid jwt token"));
      }

      (request as any)["user"] = userInfo;

      next();
    } catch (e) {
      next(new ApiErrors.APIError(401, "Invalid or expired jwt token"));
    }
  } else {
    next(new ApiErrors.APIError(401, "Invalid or expired jwt token"));
  }
};
