import { cronitor } from "util/cronitor";
import cron from "node-cron";
import user from "schemas/user";
import got from "got";
import { ClassicThumbnailsApi, ClassicUsersApi } from "openblox/classic";
import { baseLogger, client } from "index";
import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";

interface bloxlinkResponse {
  robloxID: string;
}

cronitor.wraps(cron);
cronitor.schedule("CelestialUpdateUsers", "*/60 * * * *", async () => {
  const allUsers = await user.find();

  for (const userProf of allUsers) {
    try {
      const bloxlinkLookup = await got(
        "https://api.blox.link/v4/public/guilds/1108189414351450254/discord-to-roblox/" +
          userProf.discordId,
        {
          headers: {
            Authorization: Bun.env.BLOXLINK_KEY,
          },
          responseType: "json",
          hooks: {
            beforeError: [
              (error) => {
                const { response } = error;
                const responseBody = response?.body as any;

                if (responseBody) {
                  (error.name = "BLOXLINK_ERR"),
                    (error.message = responseBody.error);
                }

                return error;
              },
            ],
          },
        }
      ).json<bloxlinkResponse>();

      const [userInfo, userThumbnail] = await Promise.all([
        ClassicUsersApi.userInfo({
          userId: Number(bloxlinkLookup.robloxID),
        }),
        ClassicThumbnailsApi.avatarsHeadshotsThumbnails({
          userIds: [Number(bloxlinkLookup.robloxID)],
          size: "420x420",
        }),
      ]);

      await user.findOneAndUpdate(
        { discordId: userProf.discordId },
        {
          robloxId: bloxlinkLookup.robloxID,
          discordId: userProf.discordId,
          robloxUsername: userInfo.data.name,
          thumbnailUrl:
            userThumbnail.data[Number(bloxlinkLookup.robloxID)]?.imageUrl,
        }
      );
    } catch (err) {
      const errorChannel = (await client.channels.fetch(
        "1332479859708133406"
      )) as GuildTextBasedChannel;
      const errorEmbed = new EmbedBuilder()
        .setDescription(
          "Oh no! I failed to update a user profile. This error is being sent because a user failed to be updated during the hourly cron job. Here is the user's information."
        )
        .setTitle("Cron Error")
        .addFields(
          {
            name: "Roblox",
            value: `${userProf.robloxUsername} (${userProf.robloxId})`,
            inline: true,
          },
          {
            name: "Discord",
            value: `${
              client.users.cache.get(userProf.discordId)?.username ?? "N/A"
            } (${userProf.discordId})`,
            inline: true,
          }
        )
        .setColor("Purple")
        .setThumbnail(userProf.thumbnailUrl || client.user.avatarURL()!);

      baseLogger.error(err);
      return errorChannel.send({
        content: "<@988801425196867644>",
        embeds: [errorEmbed],
      });
    }
  }
});
