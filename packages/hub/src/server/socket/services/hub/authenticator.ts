import { AuthService } from "../../../../services/auth/auth-service";
import { Inject, Service } from "typedi";
import { Socket } from "socket.io";
import {
  InvalidCredentialsError,
  UnAuthorizedError,
  AccessDeniedError,
} from "appium-grid-socket";

@Service()
export class HubSocketAuthenticator {
  constructor(@Inject() private authService: AuthService) {}

  async authentiate(socket: Socket | any, next: CallableFunction) {
    try {
      const apiKey = socket.handshake.query.token;
      if (!apiKey) {
        return next(
          new UnAuthorizedError("No token present in socket query params")
        );
      }
      const token = await this.authService.getUserForToken(apiKey);
      if (!token) {
        return next(new InvalidCredentialsError("Invalid api token"));
      } else if (!token.user.is_admin) {
        return next(
          new AccessDeniedError("You do not have access to register new node")
        );
      }
      socket.data.user = token.user;
      next();
    } catch (err) {
      next(err);
    }
  }
}
