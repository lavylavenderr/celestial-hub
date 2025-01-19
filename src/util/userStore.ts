import got from "got";
import { baseLogger } from "index";
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
  try {
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
      )
        .json<bloxlinkResponse>()
        .catch((err) => {
          baseLogger.error(err);
          throw new Error("BLOXLINK_ERR");
        });

      userProfile = await user.create({
        robloxId: robloxId ? robloxId : bloxlinkLookup.robloxID,
        discordId: discordId ? discordId : bloxlinkLookup.discordIDs![0],
        balance: 0,
        products: [],
      });
    }

    return userProfile.toObject();
  } catch (err) {
    baseLogger.error(err);
    throw new Error("UNKNOWN_ERR");
  }
}
