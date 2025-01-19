import { Roles } from "@constants";
import {
  ButtonBuilder,
  ButtonStyle,
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
import actionRow from "util/actionRow";
import { fetchOrCreateUser } from "util/userStore";

interface whitelistResponse {
  data: {
    owns_license: boolean;
  };
}

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
        `https://v2.parcelroblox.com/whitelist/check/roblox/${userProfile.robloxId}?product_id=${productId}`,
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

      if (whitelistCheck.data.owns_license) {
        return interaction.editReply({
          embeds: [
            new ErrorEmbed("Oops! This user already owns this product."),
          ],
        });
      }

      await got("https://v2.parcelroblox.com/whitelist/assign", {
        method: "POST",
        headers: { Authorization: Bun.env.PARCEL_KEY },
        responseType: "json",
        json: {
          product_id: productId,
          userid: userProfile.robloxId,
          userid_type: "roblox",
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
            .setTitle("Product Given")
            .setDescription("Staff Member: <@" + interaction.user.id + ">")
            .addFields(
              {
                name: "Product Name",
                value: productName,
              },
              {
                name: "Receiver",
                value: `${userProfile.robloxUsername} (${userProfile.robloxId})`,
              },
              {
                name: "Reason",
                value: options.reason ?? "No Reason Provided",
              }
            )
            .setThumbnail(userProfile.thumbnailUrl),
        ],
      });

      await client.users
        .send(userProfile.discordId, {
          embeds: [
            new EmbedBuilder()
              .setColor("#cc8eff")
              .setTitle("Tada! You've received your asset!")
              .setDescription(
                `You've received **${productName}**. You can download it below!`
              ),
          ],
          components: [
            actionRow([
              new ButtonBuilder()
                .setLabel("Download the Product")
                .setStyle(ButtonStyle.Link)
                .setURL(
                  `https://my.parcelroblox.com/retrieve/${Bun.env.PARCEL_ID}/${productId}`
                ),
            ]),
          ],
        })
        .catch();

      return interaction.editReply({
        embeds: [
          new ErrorEmbed(
            `I've successfully given **${productName}** to **${userProfile.robloxUsername}** (${userProfile.robloxId})`
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
