import { CallbackFunction, ExecuteWdCommandMessage, WdProxyRequest, WdProxyResponse } from "appium-grid-common";
import { BaseController } from "../base-controller";
import { WebdriverCommandExecutor } from "../../../../../types";
import { getLogger } from "appium-grid-logger";
import { StatusCodes } from "http-status-codes";
import { v4 as uuid } from "uuid";

const log = getLogger("SocketExecutionController");

class ExecutionController extends BaseController implements WebdriverCommandExecutor {
  private queuedRequest: Map<string, CallbackFunction> = new Map();

  protected initialize(): void {
    this.onSocketEvent("disconnect", () => {
      /* Fullfill queued requests with proper error message */
      for (const [id, cb] of this.queuedRequest.entries()) {
        this.queuedRequest.delete(id);
        cb();
      }
    });
  }

  call(proxyRequest: WdProxyRequest): Promise<WdProxyResponse> {
    const { method, url } = proxyRequest;
    log.info(`Proxying  webdriver command [${method} ${url}] to node ${this.getNodeId()}`);
    return new Promise(async (resolve) => {
      const requestId = uuid();

      const disconnectListener = () => {
        resolve({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          response: {
            value: {
              error: "node disconnected",
              message: `Node ${this.getNodeId()} got disconnected`,
            },
          },
        });
      };

      this.queuedRequest.set(requestId, disconnectListener);

      this.sendMessage<ExecuteWdCommandMessage>(
        "wd:execute",
        { request: proxyRequest },
        {
          callback: this.processWdCommandResponse(proxyRequest, (actualResponse: any) => {
            this.queuedRequest.delete(requestId);
            resolve(actualResponse);
          }),
          timeOutInMs: 1000 * 60 * 2, //2 mins
        }
      );
    });
  }

  private processWdCommandResponse(proxyRequest: WdProxyRequest, callback: CallbackFunction) {
    const { url } = proxyRequest;
    return async (...args: [Error | null, any[]]) => {
      /* args format: [null, [response]] */
      const err = args[0];
      if (err) {
        callback({
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          response: {
            value: {
              error: "unknown error",
              message: err.message,
              stacktrace: err.stack,
            },
          },
        });
      }
      const actualResponse: WdProxyResponse = args[1][0];
      log.info(
        `Recieved proxy response from node ${this.getNodeName()} for ${url} with status code [${actualResponse.status}]`
      );
      log.info(JSON.stringify(actualResponse.response));

      callback({
        status: actualResponse.status,
        response: actualResponse.response,
      });
    };
  }
}

export { ExecutionController };
