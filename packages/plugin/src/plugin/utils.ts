import { routeToCommandName } from "appium-base-driver";
import { Server } from "http";
import _ from "lodash";
import { AddressInfo } from "net";

function routeToCommand(proxyReqRes: any) {
  return {
    commandName: routeToCommandName(proxyReqRes[0].originalUrl, proxyReqRes[0].method),
    newargs: [proxyReqRes[0].body, proxyReqRes[proxyReqRes.length - 1]],
  };
}

function waitForAppiumServerToStart(httpServer: Server, cb: CallableFunction) {
  const serverStartInterval = setInterval(() => {
    if (!_.isNull(httpServer.address()) && (httpServer.address() as AddressInfo).port != null) {
      clearInterval(serverStartInterval);
      cb();
    }
  }, 1000);
}
export { routeToCommand, waitForAppiumServerToStart };
