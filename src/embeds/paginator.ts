import {
  Message,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionResponse,
  type ChatInputCommandInteraction,
  ButtonInteraction,
  MessageFlags,
} from "discord.js";

type CallbackMap = Record<string, () => number>;
type PaginatorContext = ChatInputCommandInteraction | Message;
type BaseMessage = InteractionResponse | Message | null;

export default class PaginatorSession {
  private context: PaginatorContext;
  private timeout: number;
  private running = false;
  private initiator: string;
  private baseMessage: BaseMessage = null;
  private currentPage = 0;
  private pages: EmbedBuilder[];
  private callbackMap: CallbackMap;
  private buttonsMap: Record<string, ButtonBuilder | null> = {};
  private view: ActionRowBuilder<ButtonBuilder> | null = null;

  constructor(
    context: PaginatorContext,
    initiator: string,
    pages: EmbedBuilder[],
    options: { timeout?: number } = {}
  ) {
    this.context = context;
    this.initiator = initiator;
    this.pages = pages;
    this.timeout = options.timeout || 210;

    this.callbackMap = {
      Back: this.previousPage.bind(this),
      Next: this.nextPage.bind(this),
    };
  }

  private updateButtonStates() {
    const isFirstPage = this.currentPage === 0;
    const isLastPage = this.currentPage === this.pages.length - 1;

    this.buttonsMap["Back"]?.setDisabled(isFirstPage);
    this.buttonsMap["Next"]?.setDisabled(isLastPage);
  }

  private createView(): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>();

    for (const label of Object.keys(this.callbackMap)) {
      const button = new ButtonBuilder()
        .setCustomId(label)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(label === "Back" ? true : false);

      this.buttonsMap[label] = button;
      row.addComponents(button);
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId("stop")
        .setLabel("Stop")
        .setStyle(ButtonStyle.Danger)
    );

    return row;
  }

  private async sendMessage(embed: EmbedBuilder) {
    const options = {
      embeds: [embed],
      components: this.view ? [this.view] : [],
    };

    this.baseMessage =
      this.context instanceof Message
        ? await this.context.reply(options)
        : await this.context.reply(options);
  }

  private async showPage(index: number) {
    if (index < 0 || index >= this.pages.length) return;

    this.currentPage = index;
    this.updateButtonStates();

    if (!this.running) {
      this.view = this.pages.length > 1 ? this.createView() : null;
      this.running = true;
      await this.sendMessage(this.pages[index]);
    } else if (this.baseMessage) {
      await this.baseMessage.edit({
        embeds: [this.pages[index]],
        components: this.view ? [this.view] : [],
      });
    }
  }

  private nextPage() {
    return Math.min(this.currentPage + 1, this.pages.length - 1);
  }

  private previousPage() {
    return Math.max(this.currentPage - 1, 0);
  }

  async run() {
    await this.showPage(this.currentPage);

    const collector = this.baseMessage?.createMessageComponentCollector({
      time: this.timeout * 1000,
    });

    collector?.on("collect", async (interaction: ButtonInteraction) => {
      if (!interaction.isButton()) return;

      if (interaction.user.id !== this.initiator) {
        return interaction.reply({
          content: "This isn't your interaction!",
          flags: MessageFlags.Ephemeral,
        });
      }

      const action = this.callbackMap[interaction.customId];

      if (action) {
        await this.showPage(action());
        await interaction.update({
          embeds: [this.pages[this.currentPage]],
          components: this.view ? [this.view] : [],
        });
      } else if (interaction.customId === "stop") {
        await this.terminate();
        collector.stop();
      }
    });

    collector?.on("end", async () => this.terminate());
  }

  private async terminate() {
    if (this.baseMessage) {
      await this.baseMessage.edit({ components: [] });
    }
    this.running = false;
  }
}
