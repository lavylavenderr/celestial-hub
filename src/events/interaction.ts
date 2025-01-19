import { Messages } from "@constants";
import autocomplete from "autocomplete";
import commands from "commands";
import {
  ChatInputCommandInteraction,
  Events,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { ErrorEmbed } from "embeds/response";
import { baseLogger } from "index";
import { onEvent } from "structs/Event";

export default onEvent(Events.InteractionCreate, async (interaction) => {
  const logger = baseLogger.child({ module: "Interaction Create" });

  if (interaction.isChatInputCommand()) {
    const commandName = interaction.commandName;
    const subcommandName = [
      interaction.options.getSubcommand(false),
      interaction.options.getSubcommandGroup(false),
    ]
      .filter(Boolean)
      .join(".");
    const command = commands
      .flatMap((commandGroup) => commandGroup)
      .find(
        (obj) =>
          obj.schema.command.name === commandName &&
          obj.schema.command instanceof SlashCommandBuilder
      );

    if (!command) {
      logger.error(`Cannt find command ${commandName}[${subcommandName}]`);
      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [ErrorEmbed.unrecoverable(Messages.UNKNOWN_COMMAND)],
      });
    }

    const commandFn =
      subcommandName === ""
        ? command.baseFn
        : command.subcommandFns.get(subcommandName);

    if (!commandFn) {
      logger.error(
        `Missing handler for command ${commandName}[${subcommandName}]!`
      );
      return await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [ErrorEmbed.unrecoverable(Messages.UNKNOWN_HANDLER)],
      });
    }

    logger.debug(
      `Running command ${commandName}[${subcommandName}] for user ${interaction.user.tag}`
    );

    try {
      commandFn(interaction as ChatInputCommandInteraction<"cached">);
    } catch (e) {
      logger.error(e);
    }
  } else if (interaction.isAutocomplete()) {
    const commandName = interaction.commandName;
    const autocompleteInt = autocomplete.find(
      (int) => int.id == interaction.commandId
    );

    if (!autocompleteInt) {
      logger.error(`Cannot find autocomplete file for: ${commandName}`);
      return;
    }

    try {
      autocompleteInt.intFn(interaction);
    } catch (e) {
      logger.error(e);
    }
  }
});
