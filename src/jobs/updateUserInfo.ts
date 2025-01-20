import { cronitor } from "util/cronitor";
import cron from "node-cron";
import user from "schemas/user";
import got from "got";
import { ClassicThumbnailsApi, ClassicUsersApi } from "openblox/classic";

interface bloxlinkResponse {
  robloxID: string;
}

cronitor.wraps(cron);
cronitor.schedule("CelestialUpdateUsers", "*/30 * * * *", async () => {
  const allUsers = await user.find();

  for (const userProf of allUsers) {
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

    continue;
  }
});
