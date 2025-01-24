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
import { defineSlashCommand, SlashCommand } from "structs/Command";
import { fetchOrCreateUser } from "util/userStore";

interface whitelistResponse {
  data: {
    owns_license: boolean;
  };
}

const schema = defineSlashCommand({
  name: "transfer",
  description: "Transfer a product from a player to another",
  serverOnly: true,
  serverId: "1108189414351450254",
  options: [
    new SlashCommandStringOption()
      .setName("product")
      .setDescription("The requested product")
      .setRequired(true)
      .setAutocomplete(true),
    new SlashCommandUserOption()
      .setName("sender")
      .setDescription("Pick the user/insert an ID")
      .setRequired(true),
    new SlashCommandUserOption()
      .setName("recipient")
      .setDescription("Pick the user/insert an ID")
      .setRequired(true),
  ],
});

export default new SlashCommand(
  schema,
  async (interaction) => {
    try {
      await interaction.deferReply();

      const options = {
        product: interaction.options.getString("product"),
        fromUser: interaction.options.getUser("sender"),
        toUser: interaction.options.getUser("recipient"),
      };

      if (!options.fromUser || !options.toUser) {
        return interaction.editReply({
          embeds: [new ErrorEmbed("Oops! You did not provide both users.")],
        });
      }

      const parcelLogs = (await client.channels.fetch(
        "1280065540555145267"
      )) as GuildTextBasedChannel;
      const [productName, productId] = options.product!.split("|");

      const fromUserProfile = await fetchOrCreateUser({
        discordId: options.fromUser.id,
      });
      const toUserProfile = await fetchOrCreateUser({
        discordId: options.toUser.id,
      });

      const whitelistCheck = await got(
        `https://v2.parcelroblox.com/whitelist/check/discord/${fromUserProfile.discordId}?product_id=${productId}`,
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
            new ErrorEmbed("Oops! The sender does not own this product."),
          ],
        });
      }

      const whitelistCheck2 = await got(
        `https://v2.parcelroblox.com/whitelist/check/discord/${toUserProfile.discordId}?product_id=${productId}`,
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

      if (whitelistCheck2.data.owns_license) {
        return interaction.editReply({
          embeds: [
            new ErrorEmbed("Oops! The reciever already owns this product."),
          ],
        });
      }

      await got("https://v2.parcelroblox.com/whitelist/transfer", {
        method: "PATCH",
        headers: { Authorization: Bun.env.PARCEL_KEY },
        responseType: "json",
        json: {
          product_id: productId,
          sender: {
            userid: fromUserProfile.discordId,
            userid_type: "discord",
          },
          recipient: {
            userid: toUserProfile.discordId,
            userid_type: "discord",
          },
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

      await parcelLogs.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#cc8eff")
            .setTitle("Product Transferred")
            .setDescription("Staff Member: <@" + interaction.user.id + ">")
            .addFields(
              {
                name: "Product Name",
                value: productName,
              },
              {
                name: "Receiver",
                value: `${fromUserProfile.robloxUsername}\n(${fromUserProfile.robloxId})`,
              },
              {
                name: "Recipient",
                value: `${toUserProfile.robloxUsername}\n(${toUserProfile.robloxId})`,
              }
            )
            .setThumbnail(toUserProfile.thumbnailUrl || client.user.avatarURL()!),
        ],
      });

      return interaction.editReply({
        embeds: [
          new ErrorEmbed(
            `I've successfully transferred **${productName}** from **${fromUserProfile.robloxUsername}** (${fromUserProfile.robloxId}) to **${toUserProfile.robloxUsername}** (${toUserProfile.robloxId}) as requested.`
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
