import {
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandStringOption,
} from "discord.js";
import { ErrorEmbed } from "embeds/response";
import got from "got";
import { baseLogger, client } from "index";
import { defineSlashCommand, SlashCommand } from "structs/Command";
import actionRow from "util/actionRow";
import { fetchOrCreateUser } from "util/userStore";

const schema = defineSlashCommand({
  name: "retrieve",
  description: "Retrieve a product of your choosing",
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

interface whitelistResponse {
  data: {
    owns_license: boolean;
  };
}

export default new SlashCommand(schema, async (interaction) => {
  try {
    await interaction.deferReply();

    const productId = interaction.options
      .getString("product", true)
      .split("|")[1];
    const productName = interaction.options
      .getString("product", true)
      .split("|")[0];
    const userProfile = await fetchOrCreateUser({
      discordId: interaction.user.id,
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
        embeds: [new ErrorEmbed("Uh, you don't own this product. Sorry!")],
      });
    }

    const message = await client.users
      .send(interaction.user.id, {
        embeds: [
          new EmbedBuilder()
            .setColor("Purple")
            .setTitle("Enjoy! You have retrieved a product.")
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
      .catch((err) => {
        if (err.code === 50007) {
          throw new Error("CANNOT_DM");
        } else {
          throw new Error("UNKNOWN");
        }
      });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("Purple")
          .setTitle("Check your DMs!")
          .setDescription(`You've successfully retrieved **${productName}**`),
      ],
      components: [
        actionRow([
          new ButtonBuilder()
            .setLabel("Jump to Message")
            .setStyle(ButtonStyle.Link)
            .setURL(
              `https://discord.com/channels/@me/${message.channel.id}/${message.id}`
            ),
        ]),
      ],
    });
  } catch (err) {
    baseLogger.error(err);

    if (err instanceof Error) {
      const errorMessages: Record<string, string> = {
        BLOXLINK_ERR: `The Bloxlink API returned this error: \`${err.message}\``,
        PARCEL_ERR: `The Parcel API returned this error: \`${err.message}\``,
        CANNOT_DM:
          "Oh no! Your DMs are closed, thus we are unable to send you your product.",
      };

      const message =
        err.name !== "Error"
          ? errorMessages[err.name]
          : errorMessages[err.message];

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
});
