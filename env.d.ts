import type { Client } from "discord.js";
import type { Command } from "structs/Command";

declare global {
  var hot_client: Client<true> | null;
  var hot_commands: Command<any, any>[][] | null;

  namespace NodeJS {
    interface ProcessEnv {
      DISCORD_TOKEN: string;
      DISCORD_ID: string;
      PARCEL_KEY: string;
      CRONITOR_KEY: string;
      PARCEL_SECRETKEY: string;
      BLOXLINK_KEY: string;
      MONGODB_URL: string;
      PARCEL_ID: string;
      ROBLOX_COOKIE: string;
      AUTHORIZATION_KEY: string;
      PORT: string;
      REDIS_URL: string;
    }
  }
}

export {};