import { Events } from "discord.js";
import user from "schemas/user";
import { onEvent } from "structs/Event";

export default onEvent(Events.GuildMemberRemove, async (member) => {
  await user.findOneAndDelete({ discordId: member.id });
});
