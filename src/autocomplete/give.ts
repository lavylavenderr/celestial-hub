import got from "got";
import { baseLogger } from "index";
import { AutocompleteComponent } from "structs/Autocomplete";

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

export default new AutocompleteComponent(
  "1330445963705454634",
  async (interaction) => {
    const productList = await got("https://v2.parcelroblox.com/products/all", {
      method: "GET",
      headers: {
        Authorization: Bun.env.PARCEL_KEY,
      },
    })
      .json<ParcelResponse>()
      .catch((err) => {
        baseLogger.error(err);
        return;
      });

    await interaction.respond(
      productList!.data.products.map((product) => ({
        name: product.name,
        value: product.name + "|" + product.id,
      }))
    );
  }
);
