import { model, Schema } from "mongoose";

interface IUserProfile {
  robloxId: string;
  discordId: string;
  balance: number;
  thumbnailUrl: string;
  robloxUsername: string;
}

const userSchema = new Schema<IUserProfile>({
  robloxUsername: Schema.Types.String,
  robloxId: Schema.Types.String,
  discordId: Schema.Types.String,
  balance: Schema.Types.Number,
  thumbnailUrl: Schema.Types.String,
});

const user = model<IUserProfile>("User", userSchema);
export default user;
