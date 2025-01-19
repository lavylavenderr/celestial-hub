import type { AutocompleteInteraction } from "discord.js";

export type AutocompleteHandler = (
  interaction: AutocompleteInteraction
) => void;

export class AutocompleteComponent<I extends AutocompleteInteraction> {
  public intFn: (interaction: I) => void;

  constructor(public id: string, handler: AutocompleteHandler) {
    this.intFn = handler;
  }
}
