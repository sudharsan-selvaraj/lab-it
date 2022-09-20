import yargs from "yargs/yargs";
import path from "path";
import os from "os";

const assetDir = path.join(os.homedir(), ".cache", "appium-grid");
require("dotenv").config({ path: path.join(assetDir, ".env") });

const DEFAULT_PORT = 4723;
const DEFAULT_DB = path.join(assetDir, "database.sqlite");
const MIGRATION_PATH = path.join(path.resolve(__dirname, ".."), "database", "migrations");

const parsedArgs = yargs(process.argv.slice(2))
  .options({
    address: {
      alias: "a",
      description: "IP address to listen on",
    },
    port: {
      alias: "p",
      description: "Port to start the grid server",
      default: 4723,
    },
    "base-path": {
      alias: "pa",
      description: "Base path to use as the prefix for all webdriver routes running on the server",
      default: "/",
    },
    "allow-cors": {
      description: "Whether the grid server should allow web browser connections from any host",
      type: "boolean",
      default: false,
    },
    "database-uri": {
      description: "Connection string for postgress database that will be used for storing data",
      type: "string",
    },
  })
  .parseSync();

export interface Configuration {
  appium: {
    address: string;
    port: number;
    basePath: string;
    allowCors: boolean;
  };
  assetDir: string;
  database: {
    dialect: "sqlite" | "postgres";
    uri: string;
    migrationsPath: string;
  };
  auth: {
    jwtSecret: string;
  };
  express: {
    baseApiRoute: string;
  };
}

export default {
  appium: {
    address: parsedArgs.address,
    port: Number(parsedArgs.port) || process.env.PORT || DEFAULT_PORT,
    basePath: parsedArgs["base-path"],
    allowCors: parsedArgs["allow-cors"],
  },
  database: {
    dialect: !!parsedArgs["database-uri"] ? "postgres" : "sqlite",
    uri: !!parsedArgs["database-uri"] ? !!parsedArgs["database-uri"] : DEFAULT_DB,
    migrationsPath: MIGRATION_PATH,
  },
  auth: {
    jwtSecret: process.env["GRID_JWT_SECRET"],
  },
  express: {
    baseApiRoute: "/api",
  },
} as Configuration;
