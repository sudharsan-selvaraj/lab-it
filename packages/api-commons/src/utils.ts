import { Request } from "express";

export function getUrl(request: Request) {
  return request.protocol + "://" + request.get("host") + request.originalUrl.split("?")[0];
}
