import { DiscordErrorCodes, Roles } from "@constants";
import {
  DiscordAPIError,
  EmbedBuilder,
  MessageFlags,
  SlashCommandNumberOption,
  SlashCommandStringOption,
  type GuildTextBasedChannel,
} from "discord.js";
import { ErrorEmbed } from "embeds/response";
import { baseLogger, client } from "index";
import requiresRole from "middleware/requiresRole";
import { customAlphabet } from "nanoid";
import giftcard from "schemas/giftcard";
import {
  defineSlashCommand,
  defineSlashSubcommand,
  SlashCommand,
} from "structs/Command";

const schema = defineSlashCommand({
  name: "giftcard",
  description: "The base giftcard command",
  serverOnly: true,
  serverId: "1108189414351450254",
  subcommands: [
    defineSlashSubcommand({
      name: "create",
      description: "Create a giftcard",
      options: [
        new SlashCommandNumberOption()
          .setName("amount")
          .setDescription("How much will the giftcard have?")
          .setRequired(true)
          .addChoices(
            {
              name: "$2",
              value: 2,
            },
            {
              name: "$5",
              value: 5,
            },
            {
              name: "$10",
              value: 10,
            },
            {
              name: "$20",
              value: 20,
            },
            {
              name: "$50",
              value: 50,
            }
          ),
      ],
    }),
    defineSlashSubcommand({
      name: "destroy",
      description: "Destroy a giftcard",
      options: [
        new SlashCommandStringOption()
          .setName("code")
          .setDescription("What is the giftcard code?")
          .setRequired(true),
      ],
    }),
  ],
});

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const nanoid = customAlphabet(alphabet, 4);

async function generateUniqueGiftCardCode(): Promise<string> {
  let giftCardCode: string;
  let isDuplicate: boolean;

  do {
    const arrayofLetters = [nanoid(), nanoid(), nanoid(), nanoid()];
    giftCardCode = arrayofLetters.join("-");

    const existing = await giftcard.findOne({ code: giftCardCode });
    isDuplicate = !!existing;
  } while (isDuplicate);

  return giftCardCode;
}

export default new SlashCommand(schema)
  .subcommand(
    "create",
    async (interaction) => {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const giftCardAmount = interaction.options.getNumber("amount", true);
        const giftCardCode = await generateUniqueGiftCardCode();

        const splicedArray = giftCardCode.split("-");

        delete splicedArray[2];
        delete splicedArray[3];

        splicedArray.push("XXXX", "XXXX");

        const censoredCode = splicedArray.filter((x) => x).join("-");
        const giftCardLogs = (await client.channels.fetch(
          "1305375929589039246"
        )) as GuildTextBasedChannel;

        await giftcard.create({
          code: giftCardCode,
          amount: giftCardAmount,
        });

        await giftCardLogs.send({
          embeds: [
            new EmbedBuilder()
              .setColor("#cc8eff")
              .setTitle("Giftcard Generated")
              .setDescription("Staff Member: <@" + interaction.user.id + ">")
              .addFields(
                {
                  name: "Code",
                  value: censoredCode,
                },
                {
                  name: "Value",
                  value: `$${giftCardAmount}`,
                }
              )
              .setTimestamp(),
          ],
        });

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#cc8eff")
              .setDescription(
                `I've successfully created a giftcard worth **$${giftCardAmount}** and it can now be redeemed with this code: \`${giftCardCode}\``
              ),
          ],
        });
      } catch (err) {
        baseLogger.error(err);

        if (err instanceof DiscordAPIError) {
          const errCode = err.code as number;
          const message =
            DiscordErrorCodes[errCode] || "An unknown error occurred.";

          return interaction.editReply({
            embeds: [new ErrorEmbed(message)],
          });
        }

        return interaction.editReply({
          embeds: [
            new ErrorEmbed("An unexpected error occurred, please try again."),
          ],
        });
      }
    },
    [requiresRole(Roles.BoardOfDirectors)]
  )
  .subcommand(
    "destroy",
    async (interaction) => {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const giftCardCode = interaction.options.getString("code", true);
      const requestedGiftcard = await giftcard.findOne({ code: giftCardCode });
      const giftCardLogs = (await client.channels.fetch(
        "1305375929589039246"
      )) as GuildTextBasedChannel;

      if (!requestedGiftcard || requestedGiftcard.redeemed)
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#cc8eff")
              .setDescription(
                `Uh oh! The provided giftcard doesn't exist or already has been claimed.`
              ),
          ],
        });

      await giftcard.deleteOne({ code: giftCardCode });

      await giftCardLogs.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#cc8eff")
            .setTitle("Giftcard Destroyed")
            .setDescription("Staff Member: <@" + interaction.user.id + ">")
            .addFields(
              {
                name: "Code",
                value: giftCardCode,
              },
              {
                name: "Value",
                value: `$${requestedGiftcard.amount}`,
              }
            )
            .setTimestamp(),
        ],
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#cc8eff")
            .setDescription(
              `\`${giftCardCode}\` has been invalided and all future use of this code will fail.`
            ),
        ],
      });
    },
    [requiresRole(Roles.BoardOfDirectors)]
  );
