import { model, Schema } from "mongoose";

interface IProduct {
  name: string;
  productId: string;
  description: string;
  onsale: boolean;
  cost?: number;
}

const productSchema = new Schema<IProduct>({
    name: Schema.Types.String,
    productId: Schema.Types.String,
    description: Schema.Types.String,
    onsale: Schema.Types.Boolean,
    cost: Schema.Types.Number
});

const product = model<IProduct>("Product", productSchema)
export default product;
