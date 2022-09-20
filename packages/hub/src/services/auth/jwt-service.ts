import { Configuration } from "../../config";
import { Dependencies } from "../../constants";
import { Inject, Service } from "typedi";
import jwt, { SignOptions } from "jsonwebtoken";

export interface TokenDetails {
  id: number;
  token_id: string;
}

@Service()
export class JwtService {
  constructor(@Inject(Dependencies.CONFIGURATION) private config: Configuration) {}

  sign(payload: any, options?: SignOptions) {
    return jwt.sign(payload, this.config.auth.jwtSecret, options);
  }

  decode(token: string): Promise<TokenDetails> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.config.auth.jwtSecret, async (err: any, decodedToken: TokenDetails) => {
        if (err) {
          return reject(err);
        }

        resolve(decodedToken);
      });
    });
  }
}
