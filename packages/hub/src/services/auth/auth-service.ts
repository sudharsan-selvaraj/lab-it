import { Inject, Service } from "typedi";
import uuidAPIKey from "uuid-apikey";
import { compare, genSalt, hash } from "bcryptjs";
import { JwtService } from "./jwt-service";
import { ApiKeys, Users } from "../../db/models";
import { Auth } from "../../db/models/auth";
import { v4 as uuid } from "uuid";
import { ApiErrors } from "appium-grid-api-commons";

const JWT_EXPIRY = 60 * 60 * 24; //20 hours
const REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7; //7 days
export const REFRESH_JWT_COOKIE_NAME = "auth-jwt-token";

@Service()
export class AuthService {
  constructor(@Inject() private jwtService: JwtService) {}

  async encryptPassword(password: string): Promise<string> {
    const salt = await genSalt(10);
    return hash(password, salt);
  }

  generateApiKey(): string {
    return uuidAPIKey.create({ noDashes: true }).apiKey;
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await compare(password, hashedPassword);
  }

  async generateJwtToken(user: Users) {
    let auth: Auth | null = await Auth.findOne({
      where: {
        user_id: user.id,
      },
    });

    if (!auth) {
      auth = Auth.build({
        user_id: user.id,
      } as any);
    }
    auth.token_id = uuid();
    auth.is_valid = true;
    auth.issued_time = new Date();

    let tokenDetails = {
      user_id: user.id,
      token_id: auth.token_id,
    };

    auth.refresh_token = this.jwtService.sign(tokenDetails, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    let jwtToken: string = this.jwtService.sign(tokenDetails, {
      expiresIn: JWT_EXPIRY,
    });

    await auth.save();

    return {
      token: jwtToken,
      refreshToken: auth.refresh_token,
    };
  }

  async verifyJwtToken(token: string) {
    try {
      const tokenDetails = await this.jwtService.decode(token);

      const authInfo = await Auth.findOne({
        where: {
          token_id: tokenDetails?.token_id,
        },
      });

      if (!authInfo || authInfo.is_valid == false) {
        throw new ApiErrors.UnAuthorizedError("Token expired or invalid");
      }

      return Users.scope("details").findOne({
        where: {
          id: authInfo.user_id,
        },
      });
    } catch (err) {
      throw new ApiErrors.UnAuthorizedError("Token expired or invalid");
    }
  }

  async getUserForToken(token: string) {
    return ApiKeys.findOne({
      where: {
        key: token,
      },
      include: [Users],
    });
  }

  async isKeyNameExistsForUser(userId: number, keyName: string) {
    const key = await ApiKeys.findOne({
      where: {
        user_id: userId,
        name: keyName,
      },
    });

    return !!key;
  }

  async verifyUserCredentials(username: string, password: string) {
    const user = await Users.findOne({
      where: {
        username: username,
      },
    });

    if (!user || !(await this.comparePassword(password, user.password))) {
      throw new ApiErrors.UnAuthorizedError("Invalid username or password");
    }

    return user;
  }

  async verifyCredentialsAndGenerateJwt(username: string, password: string) {
    const user = await this.verifyUserCredentials(username, password);

    return this.generateJwtToken(user);
  }
}
