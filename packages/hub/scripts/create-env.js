const crypto = require("crypto");
const path = require("path");
const os = require("os");
const fs = require("fs");

const envFilePath = path.join(os.homedir(), ".cache", "appium-grid", ".env");

function createEnv(obj) {
  let content = "";
  for (const [key, value] of Object.entries(obj)) {
    content += `${key}=${value}\n`;
  }
  console.log("Creatign env file " + envFilePath);
  fs.writeFileSync(envFilePath, content);
}

(async () => {
  if (fs.existsSync(envFilePath)) {
    return;
  }
  const jwtSecret = require("crypto").randomBytes(256).toString("base64");
  createEnv({
    GRID_JWT_SECRET: jwtSecret,
  });
})();
