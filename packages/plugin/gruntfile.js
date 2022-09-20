module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    terser: {
      build: {
        options: {
          module: true,
          compress: true,
          mangle: {
            properties: true,
          },
        },
        files: [
          {
            expand: true,
            src: ["min/index.js"],

            cwd: ".",
            rename: (dst, src) => {
              return "min/index.min.js";
            },
          },
        ],
      },
    },
  });

  grunt.loadNpmTasks("grunt-terser");
};
