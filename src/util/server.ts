import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import bodyParser from "body-parser";
import { baseLogger, client } from "index";
import { fetchOrCreateUser } from "./userStore";
import user from "schemas/user";
import got from "got";
import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";

const server = express();
server.use(bodyParser.text());
server.use(express.json());

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authorizationHeader = req.headers["authorization"];

  if (
    !authorizationHeader ||
    authorizationHeader !== Bun.env.AUTHORIZATION_KEY
  ) {
    res.status(401).json({
      message: "Unauthorized",
      status: "401",
    });
    return;
  }

  next();
};

interface PostDataUpdate {
  credits: number;
}

interface ProductPurchase {
  robloxId: string;
  productId: string;
  method: string;
  purType: string;
}

interface ParcelProduct {
  data: {
    id: string;
    name: string;
    description: string;
    onsale: boolean;
    developer_product_id: string;
  };
}

interface ModifiedBody<T> extends Request {
  body: T;
}

server.post(
  "/purchased",
  authMiddleware as any,
  async (req: ModifiedBody<ProductPurchase>, res) => {
    try {
      const { productId, robloxId, method, purType } = req.body;

      if (!productId || !robloxId) {
        res.status(400).json({
          message: "Invalid Request",
          status: "400",
        });
        return;
      }

      const purchaseLogs = (await client.channels.fetch(
        "1280065558116827228"
      )) as GuildTextBasedChannel;
      const userProfile = await fetchOrCreateUser({
        robloxId,
      });
      const requestedProduct = await got(
        "https://v2.parcelroblox.com/products/" + productId,
        {
          method: "GET",
          headers: {
            Authorization: Bun.env.PARCEL_KEY,
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
        }
      ).json<ParcelProduct>();

      await purchaseLogs.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("New Purchase")
            .addFields(
              {
                name: "Product Name",
                value: requestedProduct.data.name,
                inline: true,
              },
              {
                name: "Method",
                value: `\`${method}\``,
                inline: true,
              },
              {
                name: "Sale Type",
                value: `\`${purType}\``,
                inline: true,
              },
              {
                name: "Roblox",
                value: `${userProfile.robloxUsername}\n\`${userProfile.robloxId}\``,
                inline: true,
              },
              {
                name: "Discord",
                value: `${
                  (
                    await client.users.fetch(userProfile.discordId)
                  ).username
                }\n\`${userProfile.discordId}\``,
                inline: true,
              }
            )
            .setThumbnail(userProfile.thumbnailUrl || client.user.avatarURL()!)
            .setColor("Purple")
            .setTimestamp(),
        ],
      });

      res.status(200).json({
        message: "Purchase Logged",
        status: "OK",
      });
      return;
    } catch (err) {
      if (err instanceof Error) {
        const errorMessages: Record<string, string> = {
          BLOXLINK_ERR: err.message,
          PARCEL_ERR: err.message,
        };

        const message = errorMessages[err.name] || "An unknown error occurred.";

        res.status(500).json({
          message,
          status: "ERR",
        });
      }

      res.status(500).json({
        message: "Internal Server Error",
        status: "ERR",
      });
    }
  }
);

server.patch(
  "/credits/:robloxId",
  authMiddleware as any,
  async (req: ModifiedBody<PostDataUpdate>, res) => {
    try {
      const userProfile = await fetchOrCreateUser({
        robloxId: req.params.robloxId,
      });

      if (!req.body.credits) {
        res.status(400).json({
          message: "Missing Credits",
          status: "400",
        });
        return;
      }

      let credits = String(req.body.credits);

      if (credits.length >= 3) {
        const decimalIndex = credits.length - 2;
        credits =
          credits.slice(0, decimalIndex) + "." + credits.slice(decimalIndex);
      }

      const userBalance = userProfile.balance;
      const updatedBalance =
        Math.round(Math.max(0, userBalance - Number(credits)) * 100) / 100;

      await user.updateOne(
        { discordId: userProfile.discordId },
        { $set: { balance: updatedBalance } }
      );

      res.status(200).json({
        message: "Credits Updated",
        status: "OK",
      });
    } catch (err) {
      if (err instanceof Error) {
        const errorMessages: Record<string, string> = {
          BLOXLINK_ERR: err.message,
          PARCEL_ERR: err.message,
        };

        const message = errorMessages[err.name] || "An unknown error occurred.";

        res.status(500).json({
          message,
          status: "500",
        });
        return;
      }

      res.status(500).json({
        message: "Internal Server Error",
        status: "500",
      });
    }
  }
);

server.post(
  "/credits/:robloxId",
  authMiddleware as any,
  async (req: ModifiedBody<PostDataUpdate>, res) => {
    try {
      const userProfile = await fetchOrCreateUser({
        robloxId: req.params.robloxId,
      });

      if (!req.body.credits) {
        res.status(400).json({
          message: "Missing Credits",
          status: "400",
        });
        return;
      }

      let credits = String(req.body.credits);

      if (credits.length >= 3) {
        const decimalIndex = credits.length - 2;
        credits =
          credits.slice(0, decimalIndex) + "." + credits.slice(decimalIndex);
      }

      let userBalance = userProfile.balance;
      const updatedBalance =
        Math.round(Math.max(0, (userBalance += Number(credits))) * 100) / 100;

      await user.updateOne(
        { discordId: userProfile.discordId },
        { $set: { balance: updatedBalance } }
      );

      res.status(200).json({
        message: "Credits Updated",
        status: "OK",
      });
    } catch (err) {
      if (err instanceof Error) {
        const errorMessages: Record<string, string> = {
          BLOXLINK_ERR: err.message,
          PARCEL_ERR: err.message,
        };

        const message = errorMessages[err.name] || "An unknown error occurred.";

        res.status(500).json({
          message,
          status: "500",
        });
        return;
      }

      res.status(500).json({
        message: "Internal Server Error",
        status: "500",
      });
    }
  }
);

server.get("/credits/:robloxId", authMiddleware as any, async (req, res) => {
  try {
    const userProfile = await fetchOrCreateUser({
      robloxId: req.params.robloxId,
    });

    res.status(200).json({
      credits: Number((userProfile.balance * 100).toFixed(0)),
      status: "OK",
    });
  } catch (err) {
    baseLogger.error(err);

    if (err instanceof Error) {
      const errorMessages: Record<string, string> = {
        BLOXLINK_ERR: err.message,
        PARCEL_ERR: err.message,
      };

      const message = errorMessages[err.name] || "An unknown error occurred.";

      res.status(500).json({
        message,
        status: "ERR",
      });
    }

    res.status(500).json({
      message: "Internal Server Error",
      status: "ERR",
    });
  }
});

server.get("/", (_req, res) => {
  res.status(200).json({
    message: "Celestial Hub v1.2",
    status: "200",
  });
});

server.listen(Number(Bun.env.PORT) || 8000, () => {
  baseLogger.info("The webserver is up and running!");
});
