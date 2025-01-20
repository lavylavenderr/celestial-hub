import { model, Schema } from "mongoose";

interface IGiftcard {
  code: string;
  amount: number;
  redeemed: boolean;
}

const giftcardSchema = new Schema<IGiftcard>({
  code: Schema.Types.String,
  amount: Schema.Types.Number,
  redeemed: {
    default: false,
    type: Schema.Types.Boolean,
  },
});

const giftcard = model<IGiftcard>("Giftcard", giftcardSchema)
export default giftcard;