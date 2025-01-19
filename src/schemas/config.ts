import { Schema, model } from "mongoose";

interface IConfig {
  key: string;
  value: any;
  updatedAt: Date;
}

const configSchema = new Schema<IConfig>({
  key: String,
  value: Schema.Types.Mixed,
  updatedAt: Date,
});

const config = model<IConfig>("Config", configSchema);
export default config;
