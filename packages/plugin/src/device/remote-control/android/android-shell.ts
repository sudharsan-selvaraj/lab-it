import { EventEmitter } from "stream";
import { AndroidDevice } from "./android-device";
import * as NodePty from "node-pty";
import _ from "lodash";
import { getLogger } from "appium-grid-logger";

const log = getLogger("AndroidADBShell");

export class AndroidShell extends EventEmitter {
  private started: boolean = false;
  private shellProcess!: NodePty.IPty | null;
  constructor(private device: AndroidDevice) {
    super();
  }

  public async execute(command: string) {
    if (this.started && !_.isNil(this.shellProcess)) {
      this.shellProcess.write(command);
    }
  }

  public async start() {
    if (this.started) {
      await this.stop();
    }

    try {
      const adb = this.device.getAdb();
      this.shellProcess = NodePty.spawn(adb.executable.path, ["-s", this.device.getId(), "shell"], {
        name: "xterm-color",
        cols: 70,
        rows: 50,
      });

      this.shellProcess.onData((data: any) => {
        this.emit("on_shell_data", data);
      });

      this.started = true;
    } catch (err) {
      log.error(`Unable to start android shell for device ${this.device.getId()}`);
    }
  }

  public async stop() {
    if (!_.isNil(this.shellProcess)) {
      this.shellProcess.kill();
      this.shellProcess = null;
      this.started = false;
    }
  }
}
