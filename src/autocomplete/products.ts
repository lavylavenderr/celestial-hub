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
  ["1330445963705454634", "1330474332446523444", '1330807891699175485', '1330829533342994503', '1330843501776076840', '1330872719796867094'],
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
