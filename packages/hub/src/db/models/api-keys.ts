import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  Table,
} from "sequelize-typescript";
import { DataTypes } from "sequelize";
import { Users } from "./users";

@Table({
  tableName: "api_keys",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
})
export class ApiKeys extends Model {
  @Column({
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  })
  id?: number;

  @ForeignKey(() => Users)
  @Column({
    type: DataTypes.INTEGER,
    allowNull: false,
  })
  user_id!: string;

  @Column({
    type: DataTypes.STRING,
    allowNull: false,
  })
  name?: string;

  @Column({
    type: DataTypes.STRING,
    allowNull: false,
  })
  key?: string;

  @BelongsTo(() => Users)
  user!: Users;
}
