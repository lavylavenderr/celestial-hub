import { model, Schema } from "mongoose";

interface ITrial {
  discordId: string;
  productId: string;
  endDate: Date;
}

const trialSchema = new Schema<ITrial>({
  discordId: Schema.Types.String,
  productId: Schema.Types.String,
  endDate: Schema.Types.Date,
});

const trial = model<ITrial>("Trial", trialSchema);
export default trial;
