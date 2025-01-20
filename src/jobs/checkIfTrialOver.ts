import { cronitor } from "util/cronitor";
import cron from "node-cron";
import trial from "schemas/trial";
import { isAfter } from "date-fns";
import got from "got";

interface whitelistResponse {
  data: {
    owns_license: boolean;
  };
}

cronitor.wraps(cron);
cronitor.schedule("CelestialCheckIfTrialOver", "*/20 * * * *", async () => {
  const allTrials = await trial.find({});

  for (const currTrial of allTrials) {
    if (!isAfter(new Date(), currTrial.endDate)) {
      continue;
    }

    const whitelistCheck = await got(
      `https://v2.parcelroblox.com/whitelist/check/discord/${currTrial.discordId}?product_id=${currTrial.productId}`,
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
      continue;
    }

    await trial.deleteOne({ _id: currTrial._id }).catch((err) => err);
    await got("https://v2.parcelroblox.com/whitelist/revoke", {
      method: "DELETE",
      headers: { Authorization: Bun.env.PARCEL_KEY },
      responseType: "json",
      json: {
        product_id: currTrial.productId,
        userid: currTrial.discordId,
        userid_type: "discord",
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
  }
});
