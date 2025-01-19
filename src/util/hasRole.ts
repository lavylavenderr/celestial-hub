import type { GuildMember } from 'discord.js';

export default function hasRole(member: GuildMember, roleId: string): boolean {
  return member.roles.cache.find((role) => role.id === roleId) != undefined;
}
