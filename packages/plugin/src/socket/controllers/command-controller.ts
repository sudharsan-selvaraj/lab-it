import { BasePluginController } from "../base-plugin-controller";
import { ExecuteWdCommandMessage, SocketMessageWithCallback, WdProxyResponse } from "appium-grid-common";
import { Socket } from "socket.io-client";
import { ProxyWebDriver } from "../../wd-proxy";
import { getLogger } from "appium-grid-logger";

const log = getLogger("AppiumNodeWdProxy");

/**
 * Responsible to execute webdriver commands recieved from the hub
 */
export class CommandController extends BasePluginController {
  private proxyWebDriver: ProxyWebDriver;

  constructor(socket: Socket, meta: Map<string, string>, proxyWebDriver: ProxyWebDriver) {
    super(socket, meta);
    this.proxyWebDriver = proxyWebDriver;
  }

  protected initialize(): void {
    super.initialize();
    this.onMessage("wd:execute", this.executeCommand.bind(this));
  }

  private async executeCommand(event: string, message: SocketMessageWithCallback<ExecuteWdCommandMessage>) {
    const { request } = message.data;
    const { url, method, body } = request;

    let response: WdProxyResponse;
    const wdCommand = `[${method.toUpperCase()} ${url}]`;
    const payloadLog = !!body ? "with payload (" + JSON.stringify(body) + ")" : "with not body";

    try {
      log.info(`Recieved wd command ${wdCommand} ${payloadLog}`);
      response = await this.proxyWebDriver.makeRequest(request);
      log.info(`Recieved response from appium server for command ${wdCommand} with Response code [${response.status}]`);
      log.info(JSON.stringify(response.response));
    } catch (err) {
      response = {
        status: 500,
        response: `Unable to proxy command ${wdCommand}].\n Error: ${err}`,
      };
      log.info(`Error proxying wd command ${wdCommand}`);
      log.error(err);
    }
    this.acknowledge(message, response);
  }
}
