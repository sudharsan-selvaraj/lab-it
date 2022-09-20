import { GridDevice } from "appium-grid-common";
import { WebdriverCommandExecutor } from "../types";

export class Node {
  private id!: string;
  private name!: string;
  private host!: string;
  private port!: number;
  private ip!: string;
  private countryCode: string;
  private countryName: string;
  private sessions: string[] = [];
  private devices: Map<string, GridDevice> = new Map();
  private isActive: boolean;
  private wdProxy!: WebdriverCommandExecutor;

  constructor(opts: {
    id: string;
    name: string;
    host: string;
    ip: string;
    countryCode: string;
    countryName: string;
    port: number;
    isActive: boolean;
    devices?: Map<string, GridDevice>;
    sessions?: Array<string>;
    wdProxy: WebdriverCommandExecutor;
  }) {
    const {
      id,
      name,
      host,
      port,
      ip,
      isActive = false,
      devices = new Map(),
      sessions = [],
      wdProxy,
      countryCode,
      countryName,
    } = opts;
    this.id = id;
    this.name = name;
    this.host = host;
    this.port = port;
    this.ip = ip;
    this.isActive = isActive;
    this.devices = devices;
    this.sessions = sessions;
    this.wdProxy = wdProxy;
    this.countryCode = countryCode;
    this.countryName = countryName;
  }

  public getId() {
    return this.id;
  }

  public getName() {
    return this.name;
  }

  public getIp() {
    return this.ip;
  }

  public getCountryCode() {
    return this.countryCode;
  }

  public getCountryName() {
    return this.countryName;
  }

  public getHost() {
    return this.host;
  }

  public getPort() {
    return this.port;
  }

  public getDevices() {
    return [...this.devices.values()];
  }

  public getDeviceById(deviceid: string) {
    return this.devices.get(deviceid);
  }

  public getSessions() {
    return this.sessions;
  }

  public setIsActive(activeState: boolean) {
    this.isActive = activeState;
  }

  public getIsActive() {
    return this.isActive;
  }

  public getWdProxy() {
    return this.wdProxy;
  }

  public addDevice(device: GridDevice) {
    this.devices.set(device.getUdid(), device);
  }

  public removeDevice(deviceUdid: string) {
    this.devices.delete(deviceUdid);
  }

  public blockDevice(deviceUdid: string, sessionId?: string) {
    this.devices.get(deviceUdid)?.block(sessionId);
  }

  public unBlockDevice(deviceUdid: string) {
    this.devices.get(deviceUdid)?.unBlock();
  }

  public setSessions(sessions: string[]) {
    this.sessions = sessions;
  }

  public toJSON() {
    return {
      id: this.id,
      name: this.name,
      host: this.host,
      port: this.port,
      ip: this.ip,
      sessions: this.sessions,
      countryCode: this.countryCode,
      countryName: this.countryName,
      devices: [...this.devices.values()].map((d) => d.toJSON()),
      isActive: this.isActive,
    };
  }
}
