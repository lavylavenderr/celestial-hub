import type { GuildMember, PermissionsBitField } from 'discord.js';

export default function hasPermission(
  member: GuildMember,
  permission: bigint[] | bigint
): boolean {
  return member.permissions.has(permission);
}
