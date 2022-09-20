import { AllowNull, Column, Model, PrimaryKey, Table, DataType, BelongsTo, ForeignKey } from "sequelize-typescript";
import { Users } from "./users";

@Table({
  tableName: "auth",
  timestamps: false,
  underscored: true,
})
export class Auth extends Model<Auth> {
  @AllowNull(false)
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  auth_id!: number;

  @AllowNull(false)
  @ForeignKey(() => Users)
  @Column({
    type: DataType.INTEGER,
  })
  user_id!: number;

  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
  })
  token_id!: string;

  @AllowNull(false)
  @Column({
    type: DataType.TEXT,
  })
  refresh_token!: string;

  @AllowNull(false)
  @Column({
    type: DataType.DATE,
  })
  issued_time!: Date;

  @AllowNull(false)
  @Column({
    type: DataType.BOOLEAN,
  })
  is_valid!: boolean;

  @BelongsTo(() => Users)
  user!: Users;
}
