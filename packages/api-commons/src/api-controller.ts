import { Router, Request, Response, NextFunction } from "express";
import { getUrl } from "./utils";

export type RouteMethod = "all" | "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

export abstract class ApiController {
  protected registerHandler(router: Router, method: RouteMethod, path: string, middlewares: Array<any>, handler: any) {
    const _handler = async (request: Request, response: Response, next: NextFunction) => {
      try {
        await handler(request, response, next);
      } catch (e: any) {
        next(e);
      }
    };
    router[method](path, [...middlewares, _handler]);
  }

  abstract initializeRoutes(protectedRoute: Router, tokenRouter: Router, unProtectedRoute: Router): void;

  public sendPaginatedResponse(
    result: { rows: any[]; count: number },
    request: Request & { parsedQuery: any },
    response: Response
  ) {
    if (request.parsedQuery.paginate == true) {
      response.status(200).send({
        success: true,
        count: result.count,
        prev: this.getPreviousUrl(request, result.count),
        next: this.getNextUrl(request, result.count),
        result: result.rows,
      });
    } else {
      this.sendSuccessResponse(response, result.rows);
    }
  }

  public sendSuccessResponse(response: Response, result: any, statusCode: number = 200) {
    response.status(statusCode).send({
      success: true,
      result: result,
    });
  }

  public sendFailureResponse(response: Response, result: any, statusCode: number = 500) {
    response.status(statusCode).send({
      success: false,
      message: result,
    });
  }

  private getNextUrl(request: Request, count: number): string | null {
    if (count <= parseInt(request.query.page as any) * parseInt(request.query.page_size as any)) {
      return null;
    }
    var nextPage = parseInt(request.query.page as any) + 1;
    return this.getPaginationApiUrl(request, nextPage);
  }

  private getPreviousUrl(request: Request, count: number): string | null {
    if (parseInt(request.query.page as any) == 1 || count == 0) {
      return null;
    }
    let prevPage = parseInt(request.query.page as any) - 1;
    if (count <= parseInt(request.query.page_size as any)) {
      prevPage = 1;
    }
    return this.getPaginationApiUrl(request, prevPage);
  }

  private getPaginationApiUrl = function (request: Request, page: number) {
    let baseUrl = getUrl(request),
      queryString = "?paginate=true";
    for (let param in request.query) {
      if (request.query.hasOwnProperty(param)) {
        if (param == "page") {
          queryString = `${queryString}&page=${page}`;
        } else if (param != "paginate") {
          queryString = `${queryString}&${param}=${request.query[param]}`;
        }
      }
    }
    return baseUrl + queryString;
  };
}
