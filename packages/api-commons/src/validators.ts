import { Request, Response, NextFunction } from "express";
import { ObjectSchema } from "@hapi/joi";
import { SchemaValidationError } from "./errors";

const validatePayload: Function = function (schema: ObjectSchema, keyNotation: string, jsonFields?: string[]) {
  if (!keyNotation) {
    keyNotation = "body";
  }
  return function (request: Request, response: Response, next: NextFunction) {
    let body = keyNotation.split(".").reduce(function (acc: any, v) {
      return acc[v];
    }, request);

    (request as any)["rawBody"] = Object.assign({}, body);

    /* Remove all null values from payload */
    Object.keys(body).forEach(function (k) {
      if (body[k] === null) {
        delete body[k];
      }

      if (jsonFields && jsonFields.indexOf(k) >= 0) {
        body[k] = JSON.parse(body[k]);
      }
    });

    if (body == undefined) {
      return next(new Error("Please provide a valid body in the request"));
    }

    let validationResult = schema.validate(body);
    if (validationResult.error) {
      return next(new SchemaValidationError(validationResult));
    } else {
      (request as any)["rawBody"] = Object.assign({}, body);
      request.body = validationResult.value;
      return next();
    }
  };
};

export { validatePayload };
