import { Dependencies } from "../../constants";
import { NodeManager } from "../../nodes/node-manager";
import { Inject, Service } from "typedi";

@Service()
export class NodeService {
  constructor(@Inject(Dependencies.NODE_MANAGER) private nodeManager: NodeManager) {}

  public async getAllNodes(includeDevices: boolean = true) {
    const nodes = await this.nodeManager.getAllNodes();
    const parsednodes = nodes.map((n) => n.toJSON());

    if (!includeDevices) {
      return parsednodes.map((node) => {
        delete (node as any).devices;
        return node;
      });
    }
    return parsednodes;
  }
}
