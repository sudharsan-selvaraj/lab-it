import { Device, DeviceType } from "appium-grid-common";
import _ from "lodash";
import { services } from "appium-ios-device";

export class IosUtils {
  public static async getWdaBundleId(device: Device): Promise<string | null> {
    try {
      const service = await services.startInstallationProxyService(device.getUdid());
      const apps = await service.listApplications({ applicationType: "User" });
      const app = Object.values(apps).filter(
        (app: any) => app["CFBundleIdentifier"]?.toLowerCase().indexOf("webdriveragentrunner") >= 0
      );
      return app.length > 0 ? (app as any[])[0]["CFBundleIdentifier"] : null;
    } catch (err) {
      return null;
    }
  }

  public static isReal(device: Device) {
    return device.getType() == DeviceType.REAL;
  }
}
