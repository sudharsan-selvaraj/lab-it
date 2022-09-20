import { Controllers, Validators } from "appium-grid-api-commons";
import { Request, Response, NextFunction, Router } from "express";
import { Inject, Service } from "typedi";
import { AuthService, REFRESH_JWT_COOKIE_NAME } from "../../../../services/auth/auth-service";
import Joi, { ObjectSchema } from "joi";

@Service()
export class AuthController extends Controllers.ApiController {
  private loginPayload: ObjectSchema;

  constructor(@Inject() private authService: AuthService) {
    super();

    this.loginPayload = Joi.object({
      username: Joi.string().required(),
      password: Joi.string().required(),
    });
  }

  initializeRoutes(jwtRouter: Router, tokenRouter: Router, unProtectedRoute: Router): void {
    this.getUnprotecedRoutes().forEach((opts) =>
      this.registerHandler(unProtectedRoute, opts.method as any, opts.path, opts.middlewares || [], opts.handler)
    );
  }

  private getUnprotecedRoutes() {
    return [
      {
        method: "post",
        path: "/login",
        middlewares: [Validators.validatePayload(this.loginPayload)],
        handler: this.loginWithUsername.bind(this),
      },
    ];
  }

  private attachJwtAndRespond(response: Response, refreshJwtToken: string, result: any) {
    response.cookie(REFRESH_JWT_COOKIE_NAME, refreshJwtToken, {
      secure: true,
      httpOnly: true,
      expires: new Date(Date.now() + 60 * 60 * 24 * 1000), //24 hours
    });

    return this.sendSuccessResponse(response, result);
  }

  private async loginWithUsername(request: Request, response: Response, next: NextFunction) {
    const { username, password } = request.body;
    const result = await this.authService.verifyCredentialsAndGenerateJwt(username, password);

    return this.attachJwtAndRespond(response, result.refreshToken, {
      token: result.token,
    });
  }
}
