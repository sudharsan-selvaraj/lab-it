import { WdSession } from "./wd-session";

class SessionManager {
  private sessionMap: Map<string, WdSession> = new Map();

  public addSession(sessionId: string, sessionDetails: WdSession) {
    if (!this.sessionMap.has(sessionId)) {
      this.sessionMap.set(sessionId, sessionDetails);
    }
  }

  public getSession(sessionId: string): WdSession | undefined {
    return this.sessionMap.get(sessionId);
  }
}

export { SessionManager };
