import { ApiKeys, Users } from "../../db/models";
import { Inject, Service } from "typedi";
import { AuthService } from "../auth/auth-service";
import { UserCreationDTO } from "./user-creation.dto";

@Service()
export class UserService {
  constructor(@Inject() private authService: AuthService) {}

  public async createUser(data: UserCreationDTO) {
    const encryptedPassword = await this.authService.encryptPassword(
      data.password
    );

    return Users.create({
      username: data.username,
      password: encryptedPassword,
      email: data.email,
      is_admin: data.is_admin,
    });
  }

  public async createNewApiKey(userId: number, keyName: string = "default") {
    return await ApiKeys.create({
      user_id: userId,
      name: keyName,
      key: this.authService.generateApiKey(),
    });
  }

  public async findByUserName(username: string) {
    return Users.findOne({
      where: {
        username: username,
      },
    });
  }

  public async findById(userId: number) {
    return Users.findOne({
      where: {
        id: userId,
      },
    });
  }
}
