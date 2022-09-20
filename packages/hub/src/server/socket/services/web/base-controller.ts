import { SocketController } from "appium-grid-socket";
import { Users } from "../../../../db/models";
const uuid = require("uuid-by-string");

export class BaseController extends SocketController {
  protected getCurrentUser(): Users {
    return this.getSocket().data.user as Users;
  }
}
