import { Roles } from "@constants";
import { EmbedBuilder, SlashCommandStringOption } from "discord.js";
import { ErrorEmbed } from "embeds/response";
import got from "got";
import { baseLogger } from "index";
import requiresRole from "middleware/requiresRole";
import user from "schemas/user";
import { defineSlashCommand, SlashCommand } from "structs/Command";
import { fetchOrCreateUser } from "util/userStore";

const schema = defineSlashCommand({
  name: "give",
  description: "Give a product to the requested user",
  serverOnly: true,
  serverId: "1108189414351450254",
  options: [
    new SlashCommandStringOption()
      .setName("product")
      .setDescription("The requested product")
      .setRequired(true)
      .setAutocomplete(true),
    new SlashCommandStringOption()
      .setName("discordid")
      .setDescription("Enter the Discord ID of the user"),
    new SlashCommandStringOption()
      .setName("robloxid")
      .setDescription("Enter the Roblox ID of the user"),
    new SlashCommandStringOption()
      .setName("reason")
      .setDescription("What is the reason this action was performed"),
  ],
});

export default new SlashCommand(
  schema,
  async (interaction) => {
    try {
      await interaction.deferReply();

      const options = {
        product: interaction.options.getString("product"),
        discordId: interaction.options.getString("discordid"),
        robloxId: interaction.options.getString("robloxid"),
      };

      // Validation: Both IDs or neither provided
      if (options.discordId && options.robloxId) {
        return interaction.editReply({
          embeds: [
            new ErrorEmbed(
              "Oops! You cannot provide a Roblox ID and a Discord ID, please only provide one."
            ),
          ],
        });
      }

      if (!options.discordId && !options.robloxId) {
        return interaction.editReply({
          embeds: [
            new ErrorEmbed(
              "Oops! You did not provide a Roblox ID or a Discord ID."
            ),
          ],
        });
      }

      const [productName, productId] = options.product!.split("|");
      const userProfile = await fetchOrCreateUser({
        discordId: options.discordId,
        robloxId: options.robloxId,
      });

      if (userProfile.products.some((x) => x.productId === productId)) {
        return interaction.editReply({
          embeds: [
            new ErrorEmbed("Oops! This user already owns this product."),
          ],
        });
      }

      await got("https://v2.parcelroblox.com/whitelist/assign", {
        method: "POST",
        headers: { Authorization: Bun.env.PARCEL_KEY },
        json: {
          product_id: productId,
          userid: userProfile.robloxId,
          userid_type: "roblox",
        },
      }).catch((err) => {
        baseLogger.error(err);
        throw new Error("PARCEL_ERR");
      });

      userProfile.products.push({ name: productName, productId });
      await user.updateOne(
        { robloxId: userProfile.robloxId },
        { $set: { products: userProfile.products } }
      );

      return interaction.editReply({
        embeds: [
          new ErrorEmbed(
            `I've successfully given **${productName}** to the requested user.`
          ),
        ],
      });
    } catch (err) {
      if (err instanceof Error) {
        const errorMessages: Record<string, string> = {
          BLOXLINK_ERR:
            "Oops! There was an issue with Bloxlink, please try again later.",
          PARCEL_ERR:
            "Oops! There was an issue with Parcel, please try again later.",
        };

        const message =
          errorMessages[err.message] || "An unknown error occurred.";

        return interaction.editReply({
          embeds: [new ErrorEmbed(message)],
        });
      }

      baseLogger.error(err);
      return interaction.editReply({
        embeds: [
          new ErrorEmbed("An unexpected error occurred, please try again."),
        ],
      });
    }
  },
  [requiresRole(Roles.BoardOfDirectors)]
);
