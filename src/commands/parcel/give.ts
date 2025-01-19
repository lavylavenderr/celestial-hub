import { EmbedBuilder, SlashCommandStringOption } from "discord.js";
import { defineSlashCommand, SlashCommand } from "structs/Command";
import { fetchOrCreateUser } from "util/userStore";

const schema = defineSlashCommand({
  name: "give",
  description: "Give a product to the requested user",
  serverOnly: true,
  serverId: "1108189414351450254",
  options: [
    new SlashCommandStringOption()
      .setName("product")
      .setDescription("The requested product")
      .setRequired(true)
      .setAutocomplete(true),
    new SlashCommandStringOption()
      .setName("discordid")
      .setDescription("Enter the Discord ID of the user"),
    new SlashCommandStringOption()
      .setName("robloxid")
      .setDescription("Enter the Roblox ID of the user"),
    new SlashCommandStringOption()
      .setName("reason")
      .setDescription("What is the reason this action was performed"),
  ],
});

export default new SlashCommand(schema, async (interaction) => {
  await interaction.deferReply();

  const options = schema.command.options.reduce((acc, option) => {
    acc[option.toJSON().name] = interaction.options.getString(
      option.toJSON().name
    );
    return acc;
  }, {} as Record<string, string | null>);

  if (options.discordid && options.robloxid) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("#cc8eff")
          .setDescription(
            "Oops! You cannot provide a Roblox ID and a Discord ID, please only provide one."
          ),
      ],
    });
  } else if (options.discordid === null || options.robloxid === null) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("#cc8eff")
          .setDescription(
            "Oops! You did not provide a Roblox ID or a Discord ID."
          ),
      ],
    });
  }

  const userProfile = await fetchOrCreateUser({
    discordId: options.discordid,
    robloxId: options.robloxid,
  });

  return interaction.reply(userProfile.discordId);
});
