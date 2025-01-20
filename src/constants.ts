import type { GuildTextBasedChannel } from "discord.js";
import { client } from "index";

/**
 * User & Role IDs that may be used over and over
 */
export enum People {
  Lavender = "988801425196867644",
  scriptedCoke = "827703749715820544",
  fortuneProdigy = '707604872144355389'
}

export enum Roles {
  Executive = "1279757173982892062",
  BoardOfDirectors = "1281095722267181239",
  ParcelPerms = "1281095722267181239"
}

/**
 * Response Messages
 */
export enum Messages {
  MISSING_PERMISSION = "Oops! You don't have the permissions required to run this.",

  UNKNOWN_CHANNEL = "Oh no... I was unable to find the requested channel.",
  UNKNOWN_HANDLER = "Seems like there isn't a handler for this interaction?",
  UNKNOWN_COMPONENT = "Oops, seems like I couldn't find the component requested.",
  UNKNOWN_COMMAND = "I was unable to find the requested command. Please try again later!"
}

/**
 * Catppuccin color palette
 */
export enum Colors {
  RED = 0xf38ba8,
  BLUE = 0x89b4fa,
  GREEN = 0xa6e3a1,
}

/**
 * Discord API Errors
 */
export const DiscordErrorCodes: Record<number, string> = {
  50001: "Oh no! I'm missing the required permissions for a specific channel. Please contact the developer to fix this.",
  50013: "Aw geez.. I don't have the required permissions to complete this...",
  50007: "Oh no! Your DMs are closed, thus we are unable to send you your product."
};

/**
 * Config Defaults
 */
export const defaultConfig = {};
