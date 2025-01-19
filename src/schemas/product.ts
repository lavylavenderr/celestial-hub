import { model, Schema } from "mongoose";

interface IProduct {
  name: string;
  productId: string;
  description: string;
  onsale: true;
}

const productSchema = new Schema<IProduct>({
    name: Schema.Types.String,
    productId: Schema.Types.String,
    description: Schema.Types.String,
    onsale: Schema.Types.Boolean
});

const product = model<IProduct>("Product", productSchema)
export default product;
