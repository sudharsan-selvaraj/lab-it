import "reflect-metadata";
import { Dependencies, PluginEvents, SocketEvents } from "./contants";
import { Container } from "typedi";
import { EventEmitter } from "events";
import Configuration from "./config";
import { DeviceTracker } from "./device/trackers";
import { ProxyWebDriver } from "./wd-proxy";
import ADB from "appium-adb";
import { log } from "appium-grid-logger";
import { DeviceManager } from "./device-manager";
import { SocketClient } from "./socket/client";
import _ from "lodash";
import { RemoteDeviceControlManager } from "./device/remote-control";
import { GoIos } from "./utils/go-ios";
import { GoIosClient } from "./utils/go-ios/client";

function injectDependencies(dependencyMap: Record<any, any>) {
  for (const [key, entry] of Object.entries(dependencyMap)) {
    Container.set({
      global: true,
      id: key,
      value: entry,
    });
  }
}

export async function bootstrap() {
  let adb;
  try {
    if (!_.isNil(Configuration.adbPort)) {
      adb = new ADB({
        adbPort: Configuration.adbPort,
      });
    } else {
      adb = await ADB.createADB();
    }
  } catch (err) {
    console.log(err);
    log.error("Unable to create adb instance... So ignoring android device lookup.");
  }

  const deviceTracker = new DeviceTracker(adb as ADB);
  const pluginEventEmitter = new EventEmitter();
  const socketEventEmitter = new EventEmitter();

  const goIos = new GoIos();

  injectDependencies({
    [Dependencies.CONFIGURATION]: Configuration,
    [Dependencies.PLUGIN_EVENT_EMITTER]: pluginEventEmitter,
    [Dependencies.SOCKET_EVENT_EMITTER]: socketEventEmitter,
    [Dependencies.PROXY_WEBDRIVER]: new ProxyWebDriver({
      host: "http://127.0.0.1",
      port: Configuration.appiumPort,
      basePath: Configuration.wdBasePath,
    }),
    [Dependencies.ADB]: adb,
    [Dependencies.DEVICE_TRACKER]: deviceTracker,
    /* Maintain the below order (First the connected device needs to be validated for prerequisites before registering it to node)*/
    [Dependencies.REMOTE_DEVICE_CONTROL_MANAGER]: new RemoteDeviceControlManager(pluginEventEmitter, deviceTracker),
    [Dependencies.DEVICE_MANAGER]: new DeviceManager(deviceTracker, pluginEventEmitter),
  });

  try {
    const client = await goIos.getClient();
    Container.set({
      global: true,
      id: GoIosClient,
      value: client,
    });
    log.info("Intializing go-ios client");
  } catch (err) {
    log.error(err);
    Container.set({
      global: true,
      id: GoIosClient,
      value: null,
    });
  }

  socketEventEmitter.on(SocketEvents.NODE_REGISTERED, async () => {
    if (!deviceTracker.isInitialized()) {
      log.info(`Initializing Devicetracker..`);
      await deviceTracker.initialize();
    }
  });

  SocketClient.initialize({
    host: Configuration.hubHost,
    port: Configuration.hubPort,
  });

  process.once("SIGINT", () => {
    pluginEventEmitter.emit(PluginEvents.PROCESS_KILLED);
  });
}
