import { model, Schema } from "mongoose";

interface IProductInfo {
  name: string;
  productId: string;
}

interface IUserProfile {
  robloxId: string;
  discordId: string;
  balance: number;
  products: IProductInfo[];
}

const productSchema = new Schema<IProductInfo>({
  name: Schema.Types.String,
  productId: Schema.Types.String,
});

const userSchema = new Schema<IUserProfile>({
  robloxId: Schema.Types.String,
  discordId: Schema.Types.String,
  balance: Schema.Types.Number,
  products: [productSchema],
});

const user = model<IUserProfile>("User", userSchema);
export default user;
