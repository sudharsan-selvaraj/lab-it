var promise = require("bluebird");

const createUsersTable = function (queryInterface, DataType) {
  return queryInterface.createTable("users", {
    id: { type: DataType.INTEGER, primaryKey: true, autoIncrement: true },
    username: {
      type: DataType.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataType.STRING,
      allowNull: true,
      unique: true,
    },
    password: {
      type: DataType.TEXT,
      allowNull: false,
    },
    is_admin: {
      type: DataType.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    refresh_token: {
      type: DataType.TEXT,
    },
    created_at: DataType.DATE,
    updated_at: DataType.DATE,
  });
};

const createAuthTable = function (queryInterface, DataType) {
  return queryInterface.createTable("auth", {
    auth_id: { type: DataType.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    user_id: { type: DataType.INTEGER, unique: true, references: { model: "users", key: "id" } },
    token_id: { type: DataType.TEXT, allowNull: false, unique: true },
    refresh_token: { type: DataType.TEXT, allowNull: false, unique: true },
    issued_time: { type: DataType.DATE },
    is_valid: { type: DataType.BOOLEAN },
  });
};

const createApiKeysTable = function (queryInterface, DataType) {
  return queryInterface.createTable(
    "api_keys",
    {
      id: { type: DataType.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: DataType.INTEGER,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        allowNull: true,
      },
      name: {
        type: DataType.TEXT,
        allowNull: false,
        default: "default",
      },
      key: {
        type: DataType.STRING,
        allowNull: true,
      },
      created_at: DataType.DATE,
      updated_at: DataType.DATE,
    },
    {
      uniqueKeys: {
        Items_unique: {
          fields: ["user_id", "name"],
        },
      },
    }
  );
};

var createProjetsTable = function (queryInterface, DataType) {
  return queryInterface.createTable("projects", {
    id: { type: DataType.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataType.TEXT, allowNull: true, unique: true },
    created_by: {
      type: DataType.INTEGER,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
      allowNull: true,
    },
    created_at: DataType.DATE,
    updated_at: DataType.DATE,
  });
};

var createBuildsTable = function (queryInterface, DataType) {
  return queryInterface.createTable("builds", {
    id: { type: DataType.INTEGER, primaryKey: true, autoIncrement: true },
    project_id: {
      type: DataType.INTEGER,
      references: { model: "projects", key: "id" },
      onDelete: "CASCADE",
      allowNull: true,
    },
    created_by: {
      type: DataType.INTEGER,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
      allowNull: true,
    },
    name: { type: DataType.TEXT, allowNull: true, unique: true },
    created_at: DataType.DATE,
    updated_at: DataType.DATE,
  });
};

var createSessionTable = function (queryInterface, DataType) {
  return queryInterface.createTable("sessions", {
    id: { type: DataType.INTEGER, primaryKey: true, autoIncrement: true },
    build_id: {
      type: DataType.INTEGER,
      references: { model: "builds", key: "id" },
      onDelete: "CASCADE",
      allowNull: true,
    },
    project_id: {
      type: DataType.INTEGER,
      references: { model: "projects", key: "id" },
      onDelete: "CASCADE",
      allowNull: true,
    },
    created_by: {
      type: DataType.INTEGER,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
      allowNull: true,
    },
    session_id: { type: DataType.TEXT, unique: true },
    node_id: { type: DataType.TEXT, unique: true },
    name: { type: DataType.TEXT, allowNull: true },
    system_platform_name: { type: DataType.STRING },
    automation_name: { type: DataType.STRING, allowNull: false },
    platform: { type: DataType.STRING, allowNull: false },
    platform_version: { type: DataType.STRING, allowNull: false },
    device_name: { type: DataType.STRING, allowNull: false },
    device_udid: { type: DataType.STRING, allowNull: false },
    app: { type: DataType.STRING, allowNull: true },
    browser_name: { type: DataType.STRING, allowNull: true },
    capabilities: { type: DataType.TEXT, allowNull: false },
    desired_capabilities: { type: DataType.TEXT, allowNull: false },
    device_info: { type: DataType.TEXT, allowNull: true },
    completed: { type: DataType.BOOLEAN, defaultValue: false },
    start_time: { type: DataType.DATE, allowNull: false },
    end_time: { type: DataType.DATE, defaultValue: null },
    passed: { type: DataType.BOOLEAN, allowNull: true },
    session_status: {
      type: DataType.ENUM,
      values: ["PASSED", "FAILED", "TIMEOUT", "RUNNING"],
      defaultValue: "RUNNING",
    },
    test_result: { type: DataType.TEXT },
    created_at: DataType.DATE,
    updated_at: DataType.DATE,
  });
};

module.exports = {
  up: (queryInterface, DataType) => {
    return promise.each(
      [
        createUsersTable,
        createAuthTable,
        createApiKeysTable,
        createProjetsTable,
        createBuildsTable,
        createSessionTable,
      ],
      function (table) {
        return table(queryInterface, DataType);
      }
    );
  },
  down: (queryInterface, DataType) => {
    return promise.each(["sessions", "builds", "projects", "api_keys", "auth", "users"], function (table) {
      return queryInterface.dropTable(table);
    });
  },
};
