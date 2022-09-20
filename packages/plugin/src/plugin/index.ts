import BasePlugin from "@appium/base-plugin";
import { Application } from "express";
import { Server } from "http";
import _ from "lodash";
import { EventEmitter } from "events";
import Container from "typedi";
import { Dependencies, PluginEvents } from "../contants";
import { routeToCommand, waitForAppiumServerToStart } from "./utils";
import { CapabilityParser, NewSessionMessage, WebdriverCapability } from "appium-grid-common";
import { bootstrap } from "../bootstrap";
import { RemoteDeviceControlManager } from "src/device/remote-control";

const CAPABILITIES = {
  DEVICE_UDID: "deviceUDID",
};

class AppiumNodePlugin extends BasePlugin {
  private static pluginEventEmitter: EventEmitter;
  private static deviceControlManager: RemoteDeviceControlManager;

  constructor(pluginName: string) {
    super(pluginName);
  }

  public static async updateServer(expressApp: Application, httpServer: Server) {
    /* Wait for http server used by appium to start.
     * Only if the server is started withhout any errors,
     * the node will be registed to the grid
     */
    await bootstrap();
    AppiumNodePlugin.pluginEventEmitter = Container.get(Dependencies.PLUGIN_EVENT_EMITTER);
    AppiumNodePlugin.deviceControlManager = Container.get(Dependencies.REMOTE_DEVICE_CONTROL_MANAGER);

    waitForAppiumServerToStart(httpServer, () => {
      AppiumNodePlugin.pluginEventEmitter.emit(PluginEvents.APPIUM_SERVER_STARTED);
    });
  }

  async handle(next: () => Promise<any>, driver: any, commandName: string, ...args: any) {
    let appiumCommand = {
      driver,
      commandName,
      next,
      args,
    };

    let originalCommandName = commandName == "proxyReqRes" ? routeToCommand(args).commandName : commandName;

    if (originalCommandName == "createSession") {
      return await this.onNewSession(args, next);
    } else {
      return await next();
    }
  }

  async onNewSession(args: any[], next: any) {
    const capabilityParser = new CapabilityParser({
      capabilities: args[2],
    } as WebdriverCapability);
    const requestedCapabilities = capabilityParser.getFlattenCapability();
    const requestedDeviceUdid = capabilityParser.getUdid();

    if (!_.isNil(requestedDeviceUdid)) {
      this.emit(PluginEvents.BLOCK_DEVICE, { deviceUdid: requestedDeviceUdid });
      await AppiumNodePlugin.deviceControlManager.updateCapability(requestedDeviceUdid, args[2]);
    }

    await this.updateSessionCapabilities(args);

    const response = await next();

    if (response.error) {
      this.emit(PluginEvents.UNBLOCK_DEVICE, { deviceUdid: requestedDeviceUdid });
      return response;
    } else {
      const sessionId = response.value[0];
      const capabilities = response.value[1];

      const allocatedDeviceUdid = response.value[1][CAPABILITIES.DEVICE_UDID];
      this.notifyDeviceUsedForSession(requestedDeviceUdid, allocatedDeviceUdid, sessionId);

      this.emit(PluginEvents.NEW_SESSION, {
        rawCapabilities: requestedCapabilities,
        response: {
          sessionId,
          capabilities,
        },
      } as NewSessionMessage);
      return response;
    }
  }

  emit(eventName: string, args: any) {
    AppiumNodePlugin.pluginEventEmitter.emit(eventName, args);
  }

  private notifyDeviceUsedForSession(requestedDeviceUdid: string, allocatedDeviceUdid: string, sessionId: string) {
    if (_.isNil(requestedDeviceUdid)) {
      this.emit(PluginEvents.BLOCK_DEVICE, { deviceUdid: allocatedDeviceUdid, sessionId });
    } else if (requestedDeviceUdid != allocatedDeviceUdid) {
      this.emit(PluginEvents.UNBLOCK_DEVICE, { deviceUdid: requestedDeviceUdid });
      this.emit(PluginEvents.BLOCK_DEVICE, { deviceUdid: allocatedDeviceUdid, sessionId });
    }
  }

  private async updateSessionCapabilities(args: any[]) {
    if (!args[2].alwaysMatch) {
      return;
    }
    let rawCapabilities = Object.assign({}, args[2].firstMatch[0], args[2].alwaysMatch);

    let newCapabilities: Record<string, any> = {
      "appium:clearDeviceLogsOnStart": true,
      "appium:nativeWebScreenshot": true, //to make screenshot endpoint work in android webview tests,
    };

    Object.keys(newCapabilities).forEach((k) => {
      args[2].alwaysMatch[k] = newCapabilities[k];
    });
  }
}

export { AppiumNodePlugin };
