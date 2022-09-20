import { SocketMessage, WdProxyRequest, WdProxyResponse } from "appium-grid-common";
import { SocketController } from "appium-grid-socket";

export interface WebdriverCommandExecutor {
  call(request: WdProxyRequest): Promise<WdProxyResponse>;
}

export interface StreamProxy extends SocketController {}

export interface CreateSessionProxyRequest {
  wdProxyRequest: WdProxyRequest;
  capabilities: Record<string, any>;
}

export interface QueuedSessionRequest {
  proxySession: CreateSessionProxyRequest;
  queuedAt: Date;
  id: string;
}

export interface INodeDeviceStreamController {
  startStreaming(deviceUdid: string, startControl: boolean, socket: SocketIO.Socket): void;
  stopStreaming(deviceUdid: string): void;
  proxyMessage<T>(event: string, message: SocketMessage<T>): void;
}
