import { Colors } from '@constants';
import { EmbedBuilder } from 'discord.js';

export class ErrorEmbed extends EmbedBuilder {
  constructor(title: string, message: string) {
    super();
    this.setTitle(title).setDescription(message).setColor('Purple');
  }

  static unknown(message: string): ErrorEmbed {
    return new ErrorEmbed('Unknown Value!', message);
  }

  static unrecoverable(message: string): ErrorEmbed {
    return new ErrorEmbed('Uh oh', message).setFooter({
      text: 'Please open a ticket and notify the developers with a screenshot of this embed!',
    });
  }

  static invalidChannel(message: string): ErrorEmbed {
    return new ErrorEmbed('Invalid Channel', message);
  }
}

export class SuccessEmbed extends EmbedBuilder {
  constructor(message: string) {
    super();
    this.setTitle('Success!').setDescription(message).setColor(Colors.GREEN);
  }
}
