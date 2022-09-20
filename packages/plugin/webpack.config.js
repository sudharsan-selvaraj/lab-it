var webpack = require("webpack");
var path = require("path");
var fs = require("fs");
const TerserPlugin = require("terser-webpack-plugin");

var nodeModules = {};
fs.readdirSync("node_modules")
  .filter(function (x) {
    return [".bin"].indexOf(x) === -1;
  })
  .forEach(function (mod) {
    nodeModules[mod] = "commonjs " + mod;
  });

module.exports = {
  entry: "./build/test.js",
  target: "node",
  output: {
    path: path.join(__dirname, "min"),
    filename: "index.js",
  },
  externals: nodeModules,
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {},
          mangle: {
            module: true,
            keep_fnames: false,
          },
        },
      }),
    ],
  },
};
