import { EmbedBuilder, SlashCommandUserOption } from "discord.js";
import { ErrorEmbed } from "embeds/response";
import got from "got";
import { baseLogger, client } from "index";
import { defineSlashCommand, SlashCommand } from "structs/Command";
import { fetchOrCreateUser } from "util/userStore";

interface HubData {
  data: {
    productsData: {
      allProducts: {
        id: string;
        name: string;
        description: string;
        onsale: boolean;
        developer_product_id: string;
        playerData: {
          ownsProduct: true;
        };
      }[];
    };
  };
}

const schema = defineSlashCommand({
  name: "profile",
  description: "View the owned products of a user",
  serverOnly: true,
  serverId: "1108189414351450254",
  options: [
    new SlashCommandUserOption()
      .setName("user")
      .setDescription("Enter the Discord ID of the user"),
  ],
});

export default new SlashCommand(schema, async (interaction) => {
  try {
    await interaction.deferReply();

    const discordUser = interaction.options.getUser("user") ?? interaction.user;
    const userProfile = await fetchOrCreateUser({ discordId: discordUser.id });

    const hubData = await got(
      "https://hub.parcelroblox.com/getSession?robloxPlayerId=" +
        userProfile.robloxId,
      {
        headers: {
          Authorization: Bun.env.PARCEL_SECRETKEY,
        },
        responseType: "json",
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
      }
    ).json<HubData>();

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("Purple")
          .setTitle("User Profile")
          .addFields(
            {
              name: "Roblox",
              value: `${userProfile.robloxUsername}\n\`${userProfile.robloxId}\``,
              inline: true,
            },
            {
              name: "Discord",
              value: `${discordUser.username}\n\`${discordUser.id}\``,
              inline: true,
            },
            {
              name: "Balance",
              value: `$${userProfile.balance.toFixed(2)}`,
            },
            {
              name: "Purchased Products",
              value:
                hubData.data.productsData.allProducts
                  .filter((x) => x.playerData.ownsProduct === true)
                  .map((x) => x.name)
                  .join("\n") || "None",
            }
          )
          .setThumbnail(userProfile.thumbnailUrl || client.user.avatarURL()!),
      ],
    });
  } catch (err) {
    baseLogger.error(err);

    if (err instanceof Error) {
      const errorMessages: Record<string, string> = {
        BLOXLINK_ERR: `The Bloxlink API returned this error: \`${err.message}\``,
        PARCEL_ERR: `The Parcel API returned this error: \`${err.message}\``,
      };

      return interaction.editReply({
        embeds: [
          new ErrorEmbed(
            errorMessages[err.name] || "An unknown error occurred."
          ),
        ],
      });
    }

    return interaction.editReply({
      embeds: [
        new ErrorEmbed("An unexpected error occurred, please try again."),
      ],
    });
  }
});
