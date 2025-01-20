import { EmbedBuilder } from "discord.js";
import PaginatorSession from "embeds/paginator";
import product from "schemas/product";
import { defineSlashCommand, SlashCommand } from "structs/Command";

const schema = defineSlashCommand({
  name: "products",
  description: "View all the products we have to offer",
  serverOnly: true,
  serverId: "1108189414351450254",
});

export default new SlashCommand(schema, async (interaction) => {
  const productList = await product.find({ onsale: true });
  const chunkSize = 8;
  const productChunks = [];

  for (let i = 0; i < productList.length; i += chunkSize) {
    productChunks.push(productList.slice(i, i + chunkSize));
  }

  const productEmbeds = productChunks.map((chunk, idx) => {
    const embed = new EmbedBuilder()
      .setColor("#cc8eff")
      .setTitle("Available Products")
      .setDescription("Discover and purchase virtual assets of Celestial Tech.")
      .addFields({
        name: "Products",
        value: chunk
          .map((x) =>
            x.cost === 0
              ? x.name + " · " + "Free!"
              : x.name +
                " · " +
                x.cost +
                " <:Robux:1304895839528947804> / " +
                (String(x.cost).length === 4
                  ? String(x.cost).slice(0, 2) + "." + String(x.cost).slice(2)
                  : String(x.cost).length === 3
                  ? String(x.cost).slice(0, 1) + "." + String(x.cost).slice(1)
                  : "0." + String(x.cost)) +
                " <:celestialicon:1304899459712286831>"
          )
          .join("\n"),
      })
      .setFooter({ text: `Page ${idx + 1}/${productChunks.length}` });

    return embed;
  });

  const paginator = new PaginatorSession(
    interaction,
    interaction.user.id,
    productEmbeds
  );

  await paginator.run();
});
