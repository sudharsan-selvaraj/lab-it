const npm = require("npm-programmatic");
const path = require("path");
const fs = require("fs");
const rootDir = path.resolve(path.join(__dirname, ".."));

const installOptions = {
  cwd: rootDir,
  output: true,
};

if (fs.existsSync(path.join(rootDir, "src"))) {
  return;
}

const packages = [
  {
    name: "sqlite3@5.0.8",
    opts: installOptions,
    onError: (err) =>
      console.log(
        "Unable to install SQLite DB... Please use pogtress DB as an alternative datastore"
      ),
  },
  {
    name: "pg@8.7.3",
    opts: installOptions,
  },
];
(async () => {
  for (const package of packages) {
    try {
      console.log(`Installing ${package.name} package...`);
      await npm.install([package.name], package.opts);
    } catch (err) {
      if (!!package.onError && typeof package.onError == "function") {
        package.onError(err);
      }
    }
  }
})();
