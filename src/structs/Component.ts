import { ButtonBuilder, StringSelectMenuBuilder } from '@discordjs/builders';
import type {
  ButtonInteraction,
  ButtonStyle,
  StringSelectMenuInteraction,
} from 'discord.js';
import type { InteractionMiddlewareFn } from 'types';
import middlwareify, { type MiddlewareFn } from 'util/middlewareify';

interface ButtonComponentProps {
  label: string;
  style: ButtonStyle;
}

export function defineButtonComponent({
  label,
  style,
}: ButtonComponentProps): ButtonBuilder {
  const component = new ButtonBuilder().setLabel(label).setStyle(style);
  return component;
}

type ComponentInteractionType =
  | ButtonInteraction<'cached'>
  | StringSelectMenuInteraction<'cached'>;
export type ComponentBuilderType = ButtonBuilder | StringSelectMenuBuilder;
export type AnyComponent = ButtonComponent;

export class Component<
  C extends ComponentBuilderType,
  I extends ComponentInteractionType
> {
  public handler: (interaction: I) => void;

  constructor(
    public id: string,
    public component: C,
    handler: (interaction: I) => void,
    middleware?: InteractionMiddlewareFn<I>[]
  ) {
    component.setCustomId(id);
    this.handler = middlwareify(handler, middleware);
  }
}

export class ButtonComponent extends Component<
  ButtonBuilder,
  ButtonInteraction<'cached'>
> {}