class WdSession {
  private sessionId!: string;
  private nodeId!: string;
  private deviceId!: string;
  private completed: boolean;

  constructor({
    sessionId,
    nodeId,
    deviceId,
    completed,
  }: {
    sessionId: string;
    nodeId: string;
    deviceId: string;
    completed?: boolean;
  }) {
    this.sessionId = sessionId;
    this.nodeId = nodeId;
    this.deviceId = deviceId;
    this.completed = completed || true;
  }

  public getSessionId() {
    return this.sessionId;
  }

  public getNodeId() {
    return this.nodeId;
  }

  public getDeviceId() {
    return this.deviceId;
  }

  public isCompleted() {
    return this.completed;
  }

  public setCompleted(state: boolean) {
    this.completed = state;
  }
}

export { WdSession };
