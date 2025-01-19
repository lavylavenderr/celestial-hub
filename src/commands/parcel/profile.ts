import { EmbedBuilder, SlashCommandUserOption } from "discord.js";
import { ErrorEmbed } from "embeds/response";
import { baseLogger } from "index";
import { ClassicThumbnailsApi, ClassicUsersApi } from "openblox/classic";
import { defineSlashCommand, SlashCommand } from "structs/Command";
import { fetchOrCreateUser, updateWhitelistStatus } from "util/userStore";

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
    let userProfile = await fetchOrCreateUser({ discordId: discordUser.id });

    await updateWhitelistStatus(userProfile.robloxId);
    userProfile = await fetchOrCreateUser({ discordId: discordUser.id });

    const [userInfo, userThumbnail] = await Promise.all([
      ClassicUsersApi.userInfo({ userId: Number(userProfile.robloxId) }),
      ClassicThumbnailsApi.avatarsHeadshotsThumbnails({
        userIds: [Number(userProfile.robloxId)],
        size: "420x420",
      }),
    ]);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("Purple")
          .setTitle("User Profile")
          .addFields(
            {
              name: "Roblox",
              value: `${userInfo.data.name}\n\`${userInfo.data.id}\``,
              inline: true,
            },
            {
              name: "Discord",
              value: `${discordUser.username}\n\`${discordUser.id}\``,
              inline: true,
            },
            {
              name: "Balance",
              value: `$${userProfile.balance}`,
            },
            {
              name: "Purchased Products",
              value:
                userProfile.products.map((x) => x.name).join("\n") || "None",
            }
          )
          .setThumbnail(
            userThumbnail.data[Number(userProfile.robloxId)]?.imageUrl ?? ""
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
