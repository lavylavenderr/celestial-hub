import buyCredits from "commands/components/buyCredits";
import {
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandStringOption,
} from "discord.js";
import { ErrorEmbed } from "embeds/response";
import product from "schemas/product";
import { defineSlashCommand, SlashCommand } from "structs/Command";
import actionRow from "util/actionRow";

const schema = defineSlashCommand({
  name: "buy",
  description: "Buy a product of your choosing",
  serverOnly: true,
  serverId: "1108189414351450254",
  options: [
    new SlashCommandStringOption()
      .setName("product")
      .setDescription("The requested product")
      .setRequired(true)
      .setAutocomplete(true),
  ],
});

export default new SlashCommand(schema, async (interaction) => {
  const productId = interaction.options
    .getString("product", true)
    .split("|")[1];
  const productInfo = await product.findOne({ productId });

  if (!productInfo)
    return interaction.reply({
      embeds: [new ErrorEmbed("Oops, we couldn't find that product.")],
    });

  const robloxButton = new ButtonBuilder()
    .setLabel("Buy with Robux")
    .setURL("https://www.roblox.com/games/90645336814376/Celestial-Hub")
    .setStyle(ButtonStyle.Link);
  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("Purple")
        .setTitle(productInfo.name)
        .setDescription(productInfo.description)
        .addFields(
          {
            name: "Price",
            value: `\`${productInfo.cost} R$\``,
            inline: true,
          },
          {
            name: "Stock",
            value: "`Unlimited`",
            inline: true,
          }
        )
        .setImage(
          "https://tr.rbxcdn.com/180DAY-01098e31b3e009a7e0a49514d1af90d3/720/720/Image/Png/noFilter"
        ),
    ],
    components: [actionRow([buyCredits, robloxButton])],
  });
});
