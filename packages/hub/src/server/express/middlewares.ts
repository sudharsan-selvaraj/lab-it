import { ApiErrors } from "appium-grid-api-commons";
import { Request, Response, NextFunction } from "express";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export function catchAllHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ApiErrors.WebDriverError) {
    const error = err.getError();
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: 13,
      value: {
        error: ReasonPhrases.INTERNAL_SERVER_ERROR,
        message: `An unknown server-side error occurred while processing the command: ${error.message}`,
        stacktrace: error.stack,
      },
    });
  } else {
    let statuCode, message;
    if (err instanceof ApiErrors.APIError) {
      statuCode = err.getStatus();
      message = err.message;
    } else if (err.name.toLowerCase().indexOf("sequelize") >= 0 && (err as any).errors) {
      message = (err as any).errors.map((e: Error) => e.message).join(",");
    } else {
      message = err.message;
    }

    res.status(statuCode || 500);
    res.json({
      success: false,
      message: message,
    });
  }
}
