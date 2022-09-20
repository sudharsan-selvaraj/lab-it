#!/usr/bin/env node

import { EventEmitter } from "stream";
import Container from "typedi";
import { bootstrap } from "./bootstrap";
import { Dependencies, PluginEvents } from "./contants";

(async () => {
  await bootstrap();
  const pluginEventEmitter = Container.get(Dependencies.PLUGIN_EVENT_EMITTER) as EventEmitter;
  const deviceControlManager = Container.get(Dependencies.REMOTE_DEVICE_CONTROL_MANAGER);

  pluginEventEmitter.emit(PluginEvents.APPIUM_SERVER_STARTED);
})();
