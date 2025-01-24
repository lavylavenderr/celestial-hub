import got from "got";
import { ClassicThumbnailsApi, ClassicUsersApi } from "openblox/classic";
import user from "schemas/user";

interface FunctionParams {
  robloxId?: string | null;
  discordId?: string | null;
}

interface bloxlinkResponse {
  discordIDs?: string[];
  robloxID?: string;
}

export async function fetchOrCreateUser({
  robloxId,
  discordId,
}: FunctionParams) {
  let userProfile = await user.findOne({
    $or: [{ robloxId: robloxId }, { discordId: discordId }],
  });

  if (!userProfile) {
    const bloxlinkLookup = await got(
      `https://api.blox.link/v4/public/guilds/1108189414351450254/${
        robloxId ? "roblox-to-discord" : "discord-to-roblox"
      }/${robloxId ? robloxId : discordId}`,
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
        userId: Number(robloxId ? robloxId : bloxlinkLookup.robloxID),
      }),
      ClassicThumbnailsApi.avatarsHeadshotsThumbnails({
        userIds: [Number(robloxId ? robloxId : bloxlinkLookup.robloxID)],
        size: "420x420",
      }),
    ]);

    userProfile = await user.create({
      robloxId: robloxId ? robloxId : bloxlinkLookup.robloxID,
      discordId: discordId ? discordId : bloxlinkLookup.discordIDs![0],
      balance: 0,
      robloxUsername: userInfo.data.name,
      thumbnailUrl:
        userThumbnail.data[
          Number(robloxId ? robloxId : bloxlinkLookup.robloxID)
        ]?.imageUrl,
    });
  }

  return userProfile.toObject();
}
