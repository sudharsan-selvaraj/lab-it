import { Configuration } from "../config";
import { Sequelize, DataType, Model } from "sequelize-typescript";
import { Umzug, SequelizeStorage } from "umzug";
import path from "path";
import * as models from "./models";
import { log } from "appium-grid-logger";
import { UserService } from "../services/users/user-service";
import { Dialect } from "sequelize/types";
import Container from "typedi";

const DEFAULT_ADMIN = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";

async function runMigration(sequelize: Sequelize, migrationsPath: string) {
  const migrator = new Umzug({
    migrations: {
      glob: [path.join(migrationsPath, "*.js"), { cwd: migrationsPath }],
      resolve: ({ name, path, context }: { name: string; path: string; context: any }) => {
        const migration = require(path);
        return {
          name,
          up: async () => migration.up(context.queryInterface, context.DataType),
          down: async () => migration.down(context.queryInterface, context.DataType),
        };
      },
    },
    context: {
      queryInterface: sequelize.getQueryInterface(),
      DataType,
    },
    storage: new SequelizeStorage({
      sequelize,
    }),
    logger: undefined,
  });

  const pendingMigrations = await migrator.pending();
  if (pendingMigrations.length > 0) {
    log.info("Updating database schema..");
    await migrator.up();
  }
}

function getSequelizeInstance(opts: { dialect: Dialect; uri: string }) {
  const { dialect, uri } = opts;

  const sequelizeOptions = {
    models: Object.keys(models).map((modelName: string) => {
      return (models as any)[modelName];
    }),
    logging: false,
    dialect: dialect,
  };

  if (dialect == "postgres") {
    return new Sequelize(uri, sequelizeOptions);
  } else {
    return new Sequelize({
      ...sequelizeOptions,
      storage: uri,
    });
  }
}

async function createAdminUser(data: { username: string; password: string }) {
  const { username, password } = data;
  const userService = Container.get(UserService);
  const admin = await userService.findByUserName(username);
  if (!admin) {
    log.info("Creating default admin user");
    const adminUser = await userService.createUser({
      username,
      password,
      is_admin: true,
    });
    const apiKey = await userService.createNewApiKey(adminUser.id);

    log.info("---------------------------------------------------------------");
    log.info("             ADMIN USER CREDENTIALS                          ");
    log.info("---------------------------------------------------------------");
    log.info("");
    log.info(`  Username : ${username}`);
    log.info(`  Password : ${password}`);
    log.info(`  Api Key  : ${apiKey.key}`);
    log.info("");
    log.info("---------------------------------------------------------------");
  }
}

export async function loadDatabase(config: Configuration) {
  try {
    const sequelize = getSequelizeInstance({
      dialect: config.database.dialect,
      uri: config.database.uri,
    });
    log.info("Validating database connection..");
    await sequelize.authenticate();
    await runMigration(sequelize, config.database.migrationsPath);
    await createAdminUser({
      username: DEFAULT_ADMIN,
      password: DEFAULT_ADMIN_PASSWORD,
    });
  } catch (err) {
    console.log(err);
  }
}
