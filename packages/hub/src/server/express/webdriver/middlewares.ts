import _ from "lodash";

export function fixPythonContentType(basePath: string) {
  return (req: any, res: any, next: any) => {
    // hack because python client library gives us wrong content-type
    if (new RegExp(`^${_.escapeRegExp(basePath)}`).test(req.path) && /^Python/.test(req.headers["user-agent"])) {
      if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
        req.headers["content-type"] = "application/json; charset=utf-8";
      }
    }
    next();
  };
}
