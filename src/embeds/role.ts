import { isArray } from "./../../node_modules/sift/src/utils";
import { Colors } from "@constants";
import { EmbedBuilder } from "discord.js";

export class MissingRoleEmbed extends EmbedBuilder {
  constructor(requiredRoleId: string | string[]) {
    super();
    this.setDescription(
      `It appears you are missing the role(s) ${
        requiredRoleId instanceof Array
          ? requiredRoleId.map((x) => `<@&${x}>`).join(" ")
          : `<@&${requiredRoleId}>`
      }!`
    ).setColor(Colors.RED);
  }
}
