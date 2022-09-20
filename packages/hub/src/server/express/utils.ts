import { Request } from "express";
import _ from "lodash";

const STANDARD_CAPS = [
  "browserName",
  "browserVersion",
  "platformName",
  "acceptInsecureCerts",
  "pageLoadStrategy",
  "proxy",
  "setWindowRect",
  "timeouts",
  "unhandledPromptBehavior",
];

const VENDOR_PREFIX = "appium";
const HAS_VENDOR_PREFIX_RE = /^.+:/;

function transformCaps(caps: any) {
  const newCaps: any = {};

  if (!_.isPlainObject(caps)) {
    return caps;
  }

  const adjustedKeys = [];
  for (const key of Object.keys(caps)) {
    if (STANDARD_CAPS.includes(key) || HAS_VENDOR_PREFIX_RE.test(key)) {
      // if the cap is a standard one, or if it already has a vendor prefix, leave it unchanged
      newCaps[key] = caps[key];
    } else {
      // otherwise add the appium vendor prefix
      newCaps[`${VENDOR_PREFIX}:${key}`] = caps[key];
      adjustedKeys.push(key);
    }
  }

  return newCaps;
}

function updateCapsToW3C(caps: any) {
  const newCaps = {} as any;
  if (_.isArray(caps?.capabilities?.firstMatch)) {
    newCaps.firstMatch = caps.capabilities.firstMatch.map(transformCaps);
  }
  if (_.isPlainObject(caps?.capabilities?.alwaysMatch)) {
    newCaps.alwaysMatch = transformCaps(caps.capabilities.alwaysMatch);
  }
  if (caps.desiredCapabilities) {
    newCaps.desiredCapabilities = transformCaps(caps.desiredCapabilities);
  }
  return newCaps;
}

function getSessionIdFromRequest(request: Request) {
  let SESSION_ID_PATTERN = /\/session\/([^/]+)/;
  const match = SESSION_ID_PATTERN.exec(request.url);
  if (match) {
    return match[1];
  } else {
    return "";
  }
}

export { updateCapsToW3C, transformCaps, getSessionIdFromRequest };
