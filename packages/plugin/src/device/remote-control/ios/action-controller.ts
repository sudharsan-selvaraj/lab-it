import { ControlMessage } from "appium-grid-common";
import { WdaProxy } from "./wda-proxy";

export class IosActionController {
  constructor(private wdaProxy: WdaProxy) {}

  async onControlMessage(message: ControlMessage) {
    if (!this.wdaProxy.isStarted()) {
      return;
    }

    switch (message.type) {
      case ControlMessage.TYPE_CLICK:
      case ControlMessage.TYPE_SWIPE:
      case ControlMessage.TYPE_TEXT:
        await this.wdaProxy.performActions((message as any).action);
        break;
      case ControlMessage.TYPE_KEYCODE:
        if ((message as any).action && (message as any).action.page == "overview") {
          await this.performOverviewAction();
        } else {
          await this.wdaProxy.performIoHidEvent((message as any).action);
        }
        break;
      case ControlMessage.TYPE_ROTATE_DEVICE:
        await this.wdaProxy.rotate();
        break;
    }
  }

  private async performOverviewAction() {
    const screenSize = await this.wdaProxy.getWindowSize();

    const startPoint = {
      x: screenSize.height + 5,
      y: screenSize.width / 2,
    };

    const endPoint = {
      x: screenSize.height - 20,
      y: screenSize.width / 2,
    };

    const actions = [
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          {
            type: "pointerMove",
            duration: 0,
            x: startPoint.x,
            y: startPoint.y,
          },
          { type: "pointerDown", button: 0 },
          {
            type: "pointerMove",
            duration: 100,
            origin: "viewport",
            x: endPoint.x,
            y: endPoint.y,
          },
          { type: "pointerUp", button: 0 },
        ],
      },
    ];

    await this.wdaProxy.performActions(actions);
  }
}
