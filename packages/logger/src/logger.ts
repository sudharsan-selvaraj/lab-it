import { logger as appiumLogger } from "@appium/support";

export function getLogger(logerName: string = "AppiumGrid") {
  return appiumLogger.getLogger(logerName);
}

export const log = getLogger();
