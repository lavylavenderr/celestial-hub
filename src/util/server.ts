import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import bodyParser from "body-parser";
import { baseLogger } from "index";
import { fetchOrCreateUser } from "./userStore";
import user from "schemas/user";

const server = express();
server.use(bodyParser.text());
server.use(express.json());

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authorizationheader = req.headers["authorization"];

  if (!authorizationheader) {
    res.status(401).json({
      message: "Unauthorized",

      status: "401",
    });
  } else {
    if (authorizationheader !== Bun.env.AUTHORIZATION_KEY) {
      res.status(401).json({
        message: "Unauthorized",
        status: "401",
      });
    } else {
      next();
    }
  }
};

interface PostDataUpdate {
  credits: number;
}

interface UpdateCredits<T> extends Request {
  body: T;
}

server.post(
  "/credits/sub/:robloxId",
  authMiddleware as any,
  async (req: UpdateCredits<PostDataUpdate>, res) => {
    try {
      const userProfile = await fetchOrCreateUser({
        robloxId: req.params.robloxId,
      });

      if (!req.body.credits) {
        res.status(400).json({
          message: "Missing Credits",
          status: "NOT_FND",
        });
      }

      let credits = String(req.body.credits);

      if (credits.length === 4) {
        credits = credits.slice(0, 2) + "." + credits.slice(2);
      } else if (credits.length === 3) {
        credits = credits.slice(0, 1) + "." + credits.slice(1);
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

server.post(
  "/credits/add/:robloxId",
  authMiddleware as any,
  async (req: UpdateCredits<PostDataUpdate>, res) => {
    try {
      const userProfile = await fetchOrCreateUser({
        robloxId: req.params.robloxId,
      });

      if (!req.body.credits) {
        res.status(400).json({
          message: "Missing Credits",
          status: "NOT_FND",
        });
      }

      let credits = req.body.credits.toString();

      if (credits.length === 4) {
        credits = credits.slice(0, 2) + "." + credits.slice(2);
      } else if (credits.length === 3) {
        credits = credits.slice(0, 1) + "." + credits.slice(1);
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
    message: "Celestial Hub",
    status: "OK",
  });
});

server.listen(Number(Bun.env.PORT) || 8000, () => {
  baseLogger.info("The webserver is up and running!");
});
