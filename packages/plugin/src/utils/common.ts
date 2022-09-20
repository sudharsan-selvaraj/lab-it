import os from "os";
import { ExecuteLock } from "appium-grid-common";
import { getPortPromise } from "portfinder";

const BLOCKED_PORTS: number[] = [];
const lock = new ExecuteLock("PORT_FINDER");

export function isMac() {
  return os.platform() === "darwin";
}

export function isLinux() {
  return os.platform() === "linux";
}

export function isWindows() {
  return os.platform() === "win32";
}

export async function getFreePort() {
  return lock.execute(async () => {
    let port = await getPortPromise();
    while (BLOCKED_PORTS.indexOf(port) >= 0) {
      port = await getPortPromise({ port: BLOCKED_PORTS[BLOCKED_PORTS.length - 1] + 1 });
    }
    BLOCKED_PORTS.push(port);
    return port;
  });
}

export function getTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
