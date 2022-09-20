import axios from "axios";
import { WdProxyRequest, WdProxyResponse } from "appium-grid-common";

export class ProxyWebDriver {
  private wdBaseUrl: string;

  constructor(private opts: { host: string; port: number; basePath: string }) {
    this.wdBaseUrl = this.constructorBaseUrl();
  }

  async makeRequest(request: WdProxyRequest): Promise<WdProxyResponse> {
    try {
      let response = await axios({
        url: `${this.wdBaseUrl}${request.url}`,
        method: request.method,
        data: request.body,
        // headers: request.headers,
        params: request.queryParam,
        validateStatus: () => true,
      });

      return {
        response: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (err: any) {
      console.log(`${this.wdBaseUrl}${request.url}`);
      console.log(err);
      return {
        response: {
          value: {
            error: "unable to proxy webdriver command",
            message: err.message,
            stacktrace: err.stack,
          },
        },
        status: 500,
      };
    }
  }

  private constructorBaseUrl() {
    let url = `${this.opts.host}:${this.opts.port}${this.opts.basePath ? this.opts.basePath : ""}`;
    if (url[url.length - 1] == "/") {
      return url.substring(0, url.length - 1);
    }
    return url;
  }
}
