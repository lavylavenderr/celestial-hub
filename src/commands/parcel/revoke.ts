import { Roles } from "@constants";
import {
  EmbedBuilder,
  SlashCommandStringOption,
  SlashCommandUserOption,
  type GuildTextBasedChannel,
} from "discord.js";
import { ErrorEmbed } from "embeds/response";
import got from "got";
import { baseLogger, client } from "index";
import requiresRole from "middleware/requiresRole";
import trial from "schemas/trial";
import { defineSlashCommand, SlashCommand } from "structs/Command";
import { fetchOrCreateUser } from "util/userStore";

interface whitelistResponse {
  data: {
    owns_license: boolean;
  };
}

const schema = defineSlashCommand({
  name: "revoke",
  description: "Revoke a product from the requested user",
  serverOnly: true,
  serverId: "1108189414351450254",
  options: [
    new SlashCommandStringOption()
      .setName("product")
      .setDescription("The requested product")
      .setRequired(true)
      .setAutocomplete(true),
    new SlashCommandUserOption()
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
        discordId: interaction.options.getUser("discordid"),
        robloxId: interaction.options.getString("robloxid"),
        reason: interaction.options.getString("reason"),
      };

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

      const parcelLogs = (await client.channels.fetch(
        "1280065540555145267"
      )) as GuildTextBasedChannel;
      const [productName, productId] = options.product!.split("|");
      const userProfile = await fetchOrCreateUser({
        discordId: options.discordId?.id,
        robloxId: options.robloxId,
      });

      const whitelistCheck = await got(
        `https://v2.parcelroblox.com/whitelist/check/discord/${userProfile.discordId}?product_id=${productId}`,
        {
          headers: { Authorization: Bun.env.PARCEL_KEY },
          responseType: "json",
          hooks: {
            beforeError: [
              (error) => {
                const { response } = error;
                const responseBody = response?.body as any;
                if (responseBody) {
                  error.name = "PARCEL_ERR";
                  error.message = responseBody.message || "Unknown error";
                }
                return error;
              },
            ],
          },
        }
      ).json<whitelistResponse>();

      if (!whitelistCheck.data.owns_license) {
        return interaction.editReply({
          embeds: [
            new ErrorEmbed("Oops! This user does not own this product."),
          ],
        });
      }

      await got("https://v2.parcelroblox.com/whitelist/revoke", {
        method: "DELETE",
        headers: { Authorization: Bun.env.PARCEL_KEY },
        responseType: "json",
        json: {
          product_id: productId,
          userid: userProfile.discordId,
          userid_type: "discord",
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
      });

      const existingTrial = await trial.findOne({
        productId: productId,
        discordId: interaction.user.id,
      });
      if (existingTrial) await trial.deleteOne({ _id: existingTrial._id });

      await client.users
        .send(userProfile.discordId, {
          embeds: [
            new EmbedBuilder()
              .setColor("#cc8eff")
              .setTitle("License Revoked")
              .setDescription(
                `<:exclamation:1304850886761123972> Attention, the asset, **${productName}**, has been revoked from your profile. Any attempt in using the asset further on may result in a Celestial Technologies blacklist.\n\n<:rightarrow:1304850836559626260> **Reason:** ${
                  options.reason || "No reason provided."
                }\n\nYou may contact support by DMing <@1281933022815584310>`
              ),
          ],
        })
        .catch((err) => err);

      await parcelLogs.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#cc8eff")
            .setTitle("Product Revoked")
            .setDescription("Staff Member: <@" + interaction.user.id + ">")
            .addFields(
              {
                name: "Product Name",
                value: productName,
              },
              {
                name: "Revoked From",
                value: `${userProfile.robloxUsername} (${userProfile.robloxId})`,
              },
              {
                name: "Reason",
                value: options.reason || "No Reason Provided",
              }
            )
            .setThumbnail(userProfile.thumbnailUrl || client.user.avatarURL()!),
        ],
      });

      return interaction.editReply({
        embeds: [
          new ErrorEmbed(
            `I've successfully revoked **${productName}** from **${userProfile.robloxUsername}** (${userProfile.robloxId})`
          ),
        ],
      });
    } catch (err) {
      baseLogger.error(err);

      if (err instanceof Error) {
        const errorMessages: Record<string, string> = {
          BLOXLINK_ERR: `The Bloxlink API returned this error: \`${err.message}\``,
          PARCEL_ERR: `The Parcel API returned this error: \`${err.message}\``,
        };

        const message = errorMessages[err.name] || "An unknown error occurred.";

        return interaction.editReply({
          embeds: [new ErrorEmbed(message)],
        });
      }

      return interaction.editReply({
        embeds: [
          new ErrorEmbed("An unexpected error occurred, please try again."),
        ],
      });
    }
  },
  [requiresRole(Roles.BoardOfDirectors)]
);
