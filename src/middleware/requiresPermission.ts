import { Messages } from "@constants";
import {
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import { ErrorEmbed } from "embeds/response";
import type { ReplyableInteractionMiddlewareFn } from "types";
import hasPermission from "util/hasPermission";

export default function requiresPermission<
  T extends keyof typeof PermissionFlagsBits
>(permissions: T[]): ReplyableInteractionMiddlewareFn {
  return (next, interaction) => {
    const member = interaction.member;

    if (
      !member ||
      !hasPermission(
        member,
        permissions.map((permission) => PermissionFlagsBits[permission])
      )
    )
      return interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [
          new ErrorEmbed(
            `${Messages.MISSING_PERMISSION}\n\`${permissions.join(", ")}\``
          ),
        ],
      });

    next();
  };
}
