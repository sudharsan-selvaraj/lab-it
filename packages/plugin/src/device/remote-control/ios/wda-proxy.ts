import axios from "axios";
import XCUITest from "appium-xcuitest-driver";
import { getFreePort } from "../../../utils/common";
import { Device } from "appium-grid-common";
import { ExecuteLock } from "appium-grid-common";
import { IosUtils } from "../../../utils/ios-utils";
import { GoIosClient } from "../../../utils/go-ios/client";
import Container from "typedi";
import { DEVICE_CONNECTIONS_FACTORY } from "appium-xcuitest-driver/build/lib/device-connections-factory";
import { SubProcess } from "teen_process";
import asyncWait from "async-wait-until";
import _ from "lodash";

const WDA_PORT = 8100;
const MJPEG_PORT = 9100;

export class WdaProxy {
  private driver: any;
  private sessionId: string | null = null;
  private started: boolean = false;
  private mjpegPort!: number;
  private wdaPort!: number;
  private sessionActive: boolean = false;
  private lock: ExecuteLock;
  private goiosClient!: GoIosClient;
  private wdaProc!: SubProcess;
  private wdaError: boolean = false;

  constructor(private device: Device) {
    this.lock = new ExecuteLock(`WDA_SESSION_${device.getUdid()}`);
    this.goiosClient = Container.get(GoIosClient);
  }

  isStarted() {
    return this.started;
  }

  async createNewSession(options: { wdaBundleId?: string } = {}) {
    return this.lock.execute(async () => {
      if (!this.started) {
        [this.mjpegPort, this.wdaPort] = [await getFreePort(), await getFreePort()];
        if (IosUtils.isReal(this.device)) {
          const started = await this.startWda(options.wdaBundleId as any);
          if (!started) {
            this.wdaError = true;
            this.started = false;
            return;
          }
        }
      }
      try {
        this.driver = new XCUITest();

        const capabilities: Record<string, any> = {
          platformName: "iOS",
          "appium:deviceName": this.device.getName(),
          "appium:udid": this.device.getUdid(),
          "appium:useNewWDA": false,
          "appium:usePrebuiltWda": IosUtils.isReal(this.device),
          "appium:newCommandTimeout": 0,
          "appium:webDriverAgentUrl": this.getWebDriverAgentUrl(),
          "appium:wdaConnectionTimeout": 60 * 1000,
          "appium:mjpegServerFramerate": 10,
          "appium:updatedWDABundleId": options.wdaBundleId || undefined,
          "appium:waitForQuiescence": false,
          "appium:wdaEventloopIdleDelay": 0,
          "appium:eventLoopIdleDelaySec": 0,
          "appium:waitForIdleTimeout": 0,
          "appium:orientation": "PORTRAIT",
        };

        if (!IosUtils.isReal(this.device)) {
          capabilities["appium:wdaLocalPort"] = this.wdaPort;
          capabilities["appium:mjpegServerPort"] = this.mjpegPort;
        } else {
          await DEVICE_CONNECTIONS_FACTORY.requestConnection(this.device.getUdid(), this.mjpegPort, {
            usePortForwarding: true,
            devicePort: MJPEG_PORT,
          });
        }

        const session = await this.driver.createSession({
          alwaysMatch: capabilities,
        });

        await this.driver.updateSettings({
          animationCoolOffTimeout: 0,
          waitForQuietness: false,
          mjpegServerScreenshotQuality: 1,
        });

        console.log(session);
        this.sessionId = await this.getActiveSessionId();
        this.started = true;
        this.sessionActive = true;
      } catch (err) {
        console.log(err);
        this.started = false;
      }
    });
  }

  async startWda(bundleid: string) {
    this.wdaProc = this.goiosClient.startWda(this.device.getUdid(), bundleid);

    await DEVICE_CONNECTIONS_FACTORY.requestConnection(this.device.getUdid(), this.wdaPort, {
      usePortForwarding: true,
      devicePort: WDA_PORT,
    });

    try {
      await asyncWait(
        async () => {
          try {
            const respone = await axios({
              baseURL: `http://localhost:${this.wdaPort}/status`,
              method: "GET",
            });
            if (respone.data.value?.ready) {
              return true;
            }
            return false;
          } catch (err) {
            return false;
          }
        },
        {
          timeout: 60 * 1000,
          intervalBetweenAttempts: 1000,
        }
      );
      this.started = true;
      return true;
    } catch (err) {
      console.log("Unable to start wda process");
      console.log(err);
      return false;
    }
  }

  async isSessionActive() {
    this.sessionActive = this.sessionId == (await this.getActiveSessionId());
    return this.sessionActive;
  }

  async hasSession() {
    return (await this.getActiveSessionId()) != null;
  }

  async getWdaStatus() {
    if (!this.driver.wda) {
      return null;
    }
    const response = await axios({
      baseURL: `${this.driver.wda._url.href}status`,
      method: "GET",
    });
    return response.data;
  }

  async getActiveSessionId() {
    const status = await this.getWdaStatus();
    return _.isNil(status) ? null : status.sessionId;
  }

  async quit() {
    await this.driver.stop();
    this.started = false;
  }

  async getWindowSize() {
    return this.driver.getWindowSize();
  }

  public getWebDriverAgentUrl() {
    return this.started ? `http://localhost:${this.wdaPort}` : undefined;
  }

  public getMjpeServerUrl() {
    return `http://localhost:${this.mjpegPort}`;
  }

  async performActions(action: any) {
    if (this.started && this.sessionActive) {
      try {
        console.log("performing action");
        await this.driver.performActions(action);
      } catch (err) {
        console.log(err);
      }
    }
  }

  async performIoHidEvent(action: { page: string; usage: string; duration: any }) {
    if (this.started && this.sessionActive) {
      try {
        await this.driver.mobilePerformIoHidEvent(action);
      } catch (err) {
        console.log(err);
      }
    }
  }

  async rotate() {
    if (this.started && this.sessionActive) {
      try {
        let desiredOrientation = "PORTRAIT";
        const rotation = await this.driver.proxyCommand("/orientation", "GET");
        if (rotation == desiredOrientation) {
          desiredOrientation = "LANDSCAPE";
        }

        await this.driver.proxyCommand("/orientation", "POST", { orientation: desiredOrientation });
      } catch (err) {
        console.log(err);
      }
    }
  }
}
