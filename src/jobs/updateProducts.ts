import { cronitor } from "util/cronitor";
import cron from "node-cron";
import got from "got";
import product from "schemas/product";

interface ParcelProduct {
  id: string;
  name: string;
  description: string;
  onsale: boolean;
}

interface ParcelResponse {
  data: {
    amount: number;
    products: ParcelProduct[];
  };
}

cronitor.wraps(cron);
cronitor.schedule("CelestialSyncProducts", "*/10 * * * *", async () => {
  const productList = await got("https://v2.parcelroblox.com/products/all", {
    method: "GET",
    headers: {
      Authorization: Bun.env.PARCEL_KEY,
    },
    hooks: {
      beforeError: [
        (error) => {
          const { response } = error;
          const responseBody = response?.body as any;

          if (responseBody) {
            (error.name = "PARCEL_ERR"), (error.message = responseBody.message);
          }

          return error;
        },
      ],
    },
  }).json<ParcelResponse>();

  const existingProducts = await product.find({}, { productId: 1 });
  const existingProductIds = new Set(existingProducts.map((p) => p.productId));

  const newProducts = productList.data.products.filter(
    (p) => !existingProductIds.has(p.id)
  );

  if (newProducts.length > 0) {
    await product.insertMany(
      newProducts.map((p) => ({
        productId: p.id,
        name: p.name,
        description: p.description,
        onsale: p.onsale,
      }))
    );
  }
});
