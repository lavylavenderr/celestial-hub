import {
  ApplicationCommandOptionBase,
  ChatInputCommandInteraction,
  Collection,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  type ApplicationCommand,
} from "discord.js";
import type { InteractionMiddlewareFn } from "types";
import middlwareify, { type MiddlewareFn } from "util/middlewareify";

interface SlashCommandProps {
  name: string;
  description: string;
  defaultPermissions?: Parameters<
    SlashCommandBuilder["setDefaultMemberPermissions"]
  >[0];
  options?: ApplicationCommandOptionBase[];
  subcommands?: (
    | SlashCommandSubcommandGroupBuilder
    | SlashCommandSubcommandBuilder
  )[];
  serverOnly: boolean;
  serverId?: string;
}

interface SubcommandGroupProps {
  name: string;
  description: string;
  subcommands: SlashCommandSubcommandBuilder[];
}

interface SlashSubcommandProps {
  name: string;
  description: string;
  options?: ApplicationCommandOptionBase[];
}

interface MainCmdReturnType {
  command: SlashCommandBuilder;
  serverId?: string;
}

export function defineSlashCommand({
  name,
  description,
  defaultPermissions,
  options = [],
  subcommands = [],
  serverOnly,
  serverId,
}: SlashCommandProps): MainCmdReturnType {
  const command = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setContexts(serverOnly ? [0] : [0, 1, 2])
    .setDefaultMemberPermissions(defaultPermissions);
  for (const option of options) command.options.push(option);
  for (const subcommand of subcommands)
    if (subcommand instanceof SlashCommandSubcommandBuilder)
      command.addSubcommand(subcommand);
    else command.addSubcommandGroup(subcommand);

  return {
    serverId,
    command,
  };
}

export function defineSubcommandGroup({
  name,
  description,
  subcommands,
}: SubcommandGroupProps): SlashCommandSubcommandGroupBuilder {
  const group = new SlashCommandSubcommandGroupBuilder()
    .setName(name)
    .setDescription(description);
  for (const subcommand of subcommands) group.addSubcommand(subcommand);
  return group;
}

export function defineSlashSubcommand({
  name,
  description,
  options = [],
}: SlashSubcommandProps): SlashCommandSubcommandBuilder {
  const command = new SlashCommandSubcommandBuilder()
    .setName(name)
    .setDescription(description);
  for (const option of options) command.options.push(option);
  return command;
}

type CommandType = MainCmdReturnType;
type CommandInteractionType =
  | ChatInputCommandInteraction<"cached">
  | MessageContextMenuCommandInteraction<"cached">;

export class Command<S extends CommandType, I extends CommandInteractionType> {
  public baseFn: (interaction: I) => void;

  constructor(
    public schema: S,
    baseFn: (interaction: I) => void = () => {},
    middleware?: InteractionMiddlewareFn<I>[]
  ) {
    this.baseFn = middlwareify(baseFn, middleware);
  }
}

export class SlashCommand<
  S extends CommandType,
  I extends ChatInputCommandInteraction<"cached">
> extends Command<S, I> {
  public subcommandFns: Collection<string, (interaction: I) => void> =
    new Collection();

  public subcommand(
    subcommandName: string,
    subcommandFn: (interaction: I) => void,
    middleware?: InteractionMiddlewareFn<I>[]
  ): this {
    this.subcommandFns.set(
      subcommandName,
      middlwareify(subcommandFn, middleware)
    );
    return this;
  }
}
