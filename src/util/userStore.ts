import { isAfter, subMinutes } from "date-fns";
import got from "got";
import { ClassicThumbnailsApi, ClassicUsersApi } from "openblox/classic";
import product from "schemas/product";
import user from "schemas/user";

interface FunctionParams {
  robloxId?: string | null;
  discordId?: string | null;
}

interface bloxlinkResponse {
  discordIDs?: string[];
  robloxID?: string;
}

interface whitelistResponse {
  data: {
    owns_license: boolean;
  };
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
      products: [],
      robloxUsername: userInfo.data.name,
      thumbnailUrl:
        userThumbnail.data[
          Number(robloxId ? robloxId : bloxlinkLookup.robloxID)
        ]?.imageUrl,
    });

    await updateWhitelistStatus(userProfile.robloxId);
  }

  return userProfile.toObject();
}

export async function updateWhitelistStatus(robloxId: string) {
  const productList = await product.find({}, { _id: 0, productId: 1, name: 1 });
  const userProfile = await user.findOne({ robloxId });

  if (
    !userProfile ||
    (userProfile.lastRefreshed &&
      !isAfter(new Date(userProfile.lastRefreshed), subMinutes(new Date(), 10)))
  ) {
    return;
  }

  const existingProductIds = new Set(
    userProfile.products.map((p) => p.productId)
  );
  const toUpdate = [];

  for (const product of productList) {
    if (product.productId === "678cd73538691db3a9f44432") {
      continue;
    }

    const whitelistCheck = await got(
      `https://v2.parcelroblox.com/whitelist/check/roblox/${robloxId}?product_id=${product.productId}`,
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

    if (
      !existingProductIds.has(product.productId) &&
      whitelistCheck.data.owns_license
    ) {
      toUpdate.push({ name: product.name, productId: product.productId });
    }
  }

  if (toUpdate.length > 0) {
    userProfile.products.push(...toUpdate);
    userProfile.lastRefreshed = new Date();
    await userProfile.save();
  }
}
