import {
  CapabilityParser,
  GridDevice,
  ExecuteLock,
  filterArray,
  getSessionIdFromSessionResponse,
  isWdResponseSuccess,
  WdProxyResponse,
  WebdriverCapability,
} from "appium-grid-common";
import { getLogger } from "appium-grid-logger";
import { NodeManager } from "../nodes/node-manager";
import { CreateSessionProxyRequest } from "../types";
import { Node } from "../nodes/node";
import asyncWait from "async-wait-until";
import _ from "lodash";
import { StatusCodes } from "http-status-codes";
import { SessionManager } from "../nodes/session-manager";
import { WdSession } from "../nodes/wd-session";
import { BlockedAutomationDevicePool } from "./blocked-device-pool";
import Container from "typedi";
import { Request } from "express";

const log = getLogger("AppiumGridDistributor");

class Distributor {
  private asyncLock: ExecuteLock = new ExecuteLock("DISTRIBUTOR_SESSION_QUEUE");
  private blockedDevicePool: BlockedAutomationDevicePool;

  constructor(private sessionManager: SessionManager, private nodeManager: NodeManager) {
    this.blockedDevicePool = Container.get(BlockedAutomationDevicePool);
  }

  async createNewSession(
    proxySession: CreateSessionProxyRequest,
    request: Request
  ): Promise<WdProxyResponse | boolean> {
    const { capabilities } = proxySession;
    const capabilityParser = new CapabilityParser(capabilities as WebdriverCapability);
    let requestClosed = false;

    const onRequestClosed = () => {
      requestClosed = true;
    };
    request.socket.on("close", onRequestClosed);

    log.info(`Finding matching node for session with capabilities ${JSON.stringify(capabilities)}`);
    try {
      const nodeConfig: { node: Node; device: GridDevice } = await asyncWait(
        async () => {
          if (requestClosed) {
            return true;
          }
          const nodeConfig = await this.findNodeForCapability(capabilityParser);
          if (!nodeConfig) {
            log.info(`Waiting for a node to server new session request`);
            return false;
          }
          this.blockedDevicePool.addDevice(nodeConfig.device);
          return nodeConfig;
        },
        {
          intervalBetweenAttempts: 3000,
          timeout: 180000,
        }
      );
      request.socket.off("close", onRequestClosed);
      if (requestClosed) {
        if (!_.isBoolean(nodeConfig) && _.has(nodeConfig, "device")) {
          log.info(`Removing device ${nodeConfig.device.getUdid()} from blocked pool`);
          this.blockedDevicePool.removeDevice(nodeConfig.node.getId(), nodeConfig.device.getUdid());
        }
        return false;
      }
      const { node, device } = nodeConfig;
      log.info(`Node ${node.getName()} can fullfill new session with capability ${JSON.stringify(capabilities)}`);

      capabilityParser.addDeviceUdid(device.getUdid());
      const wdResponse = await node.getWdProxy().call({
        ...proxySession.wdProxyRequest,
        body: capabilityParser.getW3CCapability(),
      });

      if (isWdResponseSuccess(wdResponse)) {
        const sessionId: string = getSessionIdFromSessionResponse(wdResponse.response);

        const wdSession = new WdSession({
          sessionId,
          nodeId: node.getId(),
          deviceId: device.getUdid(),
          completed: false,
        });
        this.sessionManager.addSession(sessionId, wdSession);
      }
      this.blockedDevicePool.removeDevice(device.getNodeId(), device.getUdid());
      return wdResponse;
    } catch (err) {
      return {
        status: StatusCodes.BAD_REQUEST,
        response: {
          value: {
            error: "node not found",
            message: `No node maching the capabilities found ${JSON.stringify(capabilities)}`,
            stacktrace: (err as any).stack,
          },
        },
      };
    }
  }

  private findDevicesForCapability(devices: Array<GridDevice>, capabilityParser: CapabilityParser) {
    const filters: Record<string, (val: any) => boolean> = {
      busy: (busy) => !busy,
      activeControlUser: (activeControlUser) => _.isNil(activeControlUser),
    };

    if (capabilityParser.hasUdid()) {
      filters["udid"] = (udid: string) => udid.toLowerCase() == capabilityParser.getUdid().toLowerCase();
    } else {
      if (capabilityParser.hasPlatformName()) {
        filters["platform"] = (platform: string) =>
          platform.toLowerCase() == capabilityParser.getPlatformName().toLowerCase();
      }

      if (capabilityParser.hasVersion()) {
        filters["version"] = (version: string) => version.toLowerCase() == capabilityParser.getVersion().toLowerCase();
      }
    }
    const freeDevices = devices.filter((d) => !this.blockedDevicePool.hasDevice(d.getNodeId(), d.getUdid()));
    return filterArray(freeDevices, filters);
  }

  private findNodeForCapability(capabilityParser: CapabilityParser) {
    return this.asyncLock.execute(async () => {
      const nodes = await this.nodeManager.getAllNodes();
      const node: Node | undefined = nodes
        .filter((node) => node.getIsActive())
        .find((node) => {
          return this.findDevicesForCapability(node.getDevices(), capabilityParser).length > 0;
        });

      if (!!node) {
        log.info(`Node ${node.getName()} can serve the session`);
        const devices = this.findDevicesForCapability(node.getDevices(), capabilityParser);
        const device = devices[0];
        device.block();
        return {
          device: device,
          node: node,
        };
      } else {
        return null;
      }
    });
  }
}

export { Distributor };
