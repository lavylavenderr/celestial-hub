import type {
  AnySelectMenuInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Interaction,
  MessageContextMenuCommandInteraction,
  ModalSubmitInteraction,
  UserContextMenuCommandInteraction,
} from 'discord.js';
import type { MiddlewareFn } from 'util/middlewareify';

export type InteractionMiddlewareFn<T extends Interaction<'cached'>> =
  MiddlewareFn<(interaction: T) => void>;

export type ReplyableInteractionMiddlewareFn = InteractionMiddlewareFn<
  | ChatInputCommandInteraction<'cached'>
  | MessageContextMenuCommandInteraction<'cached'>
  | UserContextMenuCommandInteraction<'cached'>
  | AnySelectMenuInteraction<'cached'>
  | ButtonInteraction<'cached'>
  | ModalSubmitInteraction<'cached'>
>;
