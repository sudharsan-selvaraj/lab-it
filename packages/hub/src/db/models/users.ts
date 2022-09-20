import { Column, HasMany, Model, Scopes, Table } from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { ApiKeys } from "./api-keys";

@Table({
  tableName: "users",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
@Scopes(() => ({
  details: {
    attributes: ["id", "username", "email", "created_at", "updated_at"],
  },
}))
export class Users extends Model {
  @Column({
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  })
  id!: number;

  @Column({
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  })
  username!: string;

  @Column({
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  })
  email?: string;

  @Column({
    type: DataTypes.STRING,
    allowNull: false,
  })
  password!: string;

  @Column({
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  is_admin!: boolean;

  @Column({
    type: DataTypes.TEXT,
  })
  refresh_token?: string;

  @HasMany(() => ApiKeys, { foreignKey: "user_id" })
  apiKeys!: Array<ApiKeys>;
}
