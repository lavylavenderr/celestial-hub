import { isBefore, subSeconds } from "date-fns";
import {
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import { ErrorEmbed } from "embeds/response";
import got from "got";
import { baseLogger, client } from "index";
import product from "schemas/product";
import user from "schemas/user";
import { ButtonComponent, defineButtonComponent } from "structs/Component";
import actionRow from "util/actionRow";
import { fetchOrCreateUser } from "util/userStore";

const schema = defineButtonComponent({
  label: "Buy with Credits",
  style: ButtonStyle.Secondary,
});

export default new ButtonComponent(
  "buyCredits",
  schema,
  async (interaction) => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const message = interaction.message;
      const primaryEmbed = message.embeds[0];
      const productName = primaryEmbed.title;

      if (message.interactionMetadata?.user.id !== interaction.user.id)
        return interaction.editReply("Oops, this isn't your interaction!");

      if (isBefore(message.createdAt, subSeconds(new Date(), 30)))
        return interaction.editReply(
          "Oops, this interaction is older than 30 seconds, please re-run the command."
        );

      const requestedProduct = await product.findOne({ name: productName });
      const userProfile = await fetchOrCreateUser({
        discordId: interaction.user.id,
      });

      if (!requestedProduct) {
        return interaction.editReply("Oops, we couldn't find that product.");
      }

      const formattedPrice = Number((requestedProduct!.cost! / 100).toFixed(2));
      const doesUserHaveEnough = userProfile.balance > formattedPrice;

      if (!doesUserHaveEnough) {
        return interaction.editReply("Uh oh! You don't have enough credits.");
      }

      await got("https://v2.parcelroblox.com/whitelist/assign", {
        method: "POST",
        headers: { Authorization: Bun.env.PARCEL_KEY },
        responseType: "json",
        json: {
          product_id: requestedProduct.productId,
          userid: userProfile.robloxId,
          userid_type: "roblox",
        },
        hooks: {
          beforeError: [
            (error) => {
              const { response } = error;
              const responseBody = response?.body as any;

              if (responseBody) {
                (error.name = "PARCEL_ERR"),
                  (error.message = responseBody.message);
              }

              return error;
            },
          ],
        },
      });

      const newBalance = userProfile.balance - formattedPrice;
      const roundedBalance = Math.round(newBalance * 100) / 100;
      
      await user.findOneAndUpdate(
        { discordId: interaction.user.id },
        { $set: { balance: roundedBalance } }
      );

      await client.users
        .send(userProfile.discordId, {
          embeds: [
            new EmbedBuilder()
              .setColor("#cc8eff")
              .setTitle("Thanks for your purchase!")
              .setDescription(
                `You've bought **${productName}**. You can download it below!`
              ),
          ],
          components: [
            actionRow([
              new ButtonBuilder()
                .setLabel("Download the Product")
                .setStyle(ButtonStyle.Link)
                .setURL(
                  `https://my.parcelroblox.com/retrieve/${Bun.env.PARCEL_ID}/${requestedProduct.productId}`
                ),
            ]),
          ],
        })
        .catch();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("Purple")
            .setDescription(
              `Woohoo! You've successfully purchased **${requestedProduct.name}** using your credits. The price of the product has been subtracted from your balance.`
            ),
        ],
      });
    } catch (err) {
      if (err instanceof Error) {
        const errorMessages: Record<string, string> = {
          BLOXLINK_ERR: `The Bloxlink API returned this error: \`${err.message}\``,
          PARCEL_ERR: `The Parcel API returned this error: \`${err.message}\``,
        };

        const message = errorMessages[err.name] || "An unknown error occurred.";

        return interaction.editReply({
          embeds: [new ErrorEmbed(message)],
        });
      }

      baseLogger.error(err);
      return interaction.editReply({
        embeds: [
          new ErrorEmbed("An unexpected error occurred, please try again."),
        ],
      });
    }
  }
);
