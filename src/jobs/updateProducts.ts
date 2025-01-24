import { cronitor } from "util/cronitor";
import cron from "node-cron";
import got from "got";
import product from "schemas/product";
import { ClassicDeveloperProductsApi } from "openblox/classic";
import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import { baseLogger, client } from "index";

interface ParcelProduct {
  id: string;
  name: string;
  description: string;
  onsale: boolean;
  developer_product_id: string;
}

interface ParcelResponse {
  data: {
    amount: number;
    products: ParcelProduct[];
  };
}

cronitor.wraps(cron);
cronitor.schedule("CelestialSyncProducts", "*/10 * * * *", async () => {
  try {
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
              (error.name = "PARCEL_ERR"),
                (error.message = responseBody.message);
            }

            return error;
          },
        ],
      },
    }).json<ParcelResponse>();
    const newProducts = productList.data.products;

    if (newProducts.length > 0) {
      await product.deleteMany({});

      const updatedProducts = await Promise.all(
        newProducts.map(async (product) => {
          const { data: obj } =
            await ClassicDeveloperProductsApi.developerProductCreatorDetails({
              developerProductProductId: Number(product.developer_product_id),
            });

          return {
            productId: product.id,
            name: product.name,
            description: product.description,
            onsale: product.onsale,
            cost:
              obj.priceInformation.defaultPriceInRobux == 1
                ? 0
                : obj.priceInformation.defaultPriceInRobux,
          };
        })
      );

      await product.insertMany(updatedProducts);
    }
  } catch (err) {
    const errorChannel = (await client.channels.fetch(
      "1332479859708133406"
    )) as GuildTextBasedChannel;
    const errorEmbed = new EmbedBuilder()
      .setDescription(
        "Uh oh! I've failed to sync the products via the Parcel API. Please look into this ASAP."
      )
      .setColor("Purple");

    baseLogger.error(err);
    return errorChannel.send({
      content: "<@988801425196867644>",
      embeds: [errorEmbed],
    });
  }
});
