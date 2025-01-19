import { MissingRoleEmbed } from "embeds/role";
import type { ReplyableInteractionMiddlewareFn } from "types";
import hasRole from "util/hasRole";

export default function requiresRole(
  roleId: string
): ReplyableInteractionMiddlewareFn {
  return async (next, interaction) => {
    const author = interaction.member;

    if (!author) return;
    if (!hasRole(author, roleId))
      return interaction.replied
        ? await interaction.editReply({
            embeds: [new MissingRoleEmbed(roleId)],
          })
        : await interaction.reply({
            embeds: [new MissingRoleEmbed(roleId)],
          });

    next();
  };
}
