import { EventEmitter } from "stream";
import { AndroidDevice } from "./android-device";
import * as NodePty from "node-pty";
import _ from "lodash";

export class AndroidLogCatLogger extends EventEmitter {
  private started: boolean = false;
  private logcatProcess!: NodePty.IPty | null;
  constructor(private device: AndroidDevice) {
    super();
  }

  public async startLogCapture() {
    if (this.started) {
      await this.stopLogCapture();
    }
    const adb = this.device.getAdb();
    this.logcatProcess = NodePty.spawn(adb.executable.path, ["-s", this.device.getId(), "logcat", "-v", "color"], {
      name: "xterm-color",
    });

    this.logcatProcess.onData((data: any) => {
      this.emit("on_log", data);
    });
  }

  public stopLogCapture() {
    if (!_.isNil(this.logcatProcess)) {
      this.logcatProcess.kill();
      this.logcatProcess = null;
      this.started = false;
    }
  }
}
