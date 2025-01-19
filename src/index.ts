import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import events from "./events";
import pino from "pino";
import cmdStore from "commands";
import mongoose from "mongoose";
import { seedDefaults } from "util/configStore";
import { defaultConfig } from "@constants";
import "jobs";
import { setConfig } from "openblox/config";

export const baseLogger = pino({
  level: Bun.env.LOG_LEVEL,
});

export const client =
  globalThis.hot_client ??
  new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessages,
    ],
  });

client.removeAllListeners();

for (const event of events) {
  (client[event.type] as any)(event.event, event.fn);
  baseLogger.debug(`Hooked event ${event.event}!`);
}

if (
  !globalThis.hot_commands ||
  JSON.stringify(
    cmdStore.map((commandGroup) =>
      commandGroup.map((obj) => obj.schema.command.toJSON())
    )
  ) !=
    JSON.stringify(
      globalThis.hot_commands.map((commandGroup) =>
        commandGroup.map((obj) => obj.schema.command.toJSON())
      )
    )
) {
  baseLogger.info("Refreshing commands...");

  const rest = new REST().setToken(Bun.env.DISCORD_TOKEN);

  const serverSpecificCommands = cmdStore
    .flatMap((cmdGroup) => cmdGroup.filter((obj) => obj.schema.serverId))
    .reduce((acc, obj) => {
      const serverId = obj.schema.serverId as string;

      if (!acc[serverId]) {
        acc[serverId] = [];
      }

      acc[serverId].push(obj.schema.command.toJSON());
      return acc;
    }, {} as Record<string, unknown[]>);
  const globalCommands = cmdStore.flatMap((cmdGroup) =>
    cmdGroup
      .filter((obj) => !obj.schema.serverId)
      .map((obj) => obj.schema.command.toJSON())
  );

  baseLogger.debug(`Refreshing commands...`);

  // Global Commands
  await rest.put(Routes.applicationCommands(Bun.env.DISCORD_ID), {
    body: globalCommands,
  });

  // Server Specific
  Object.entries(serverSpecificCommands).forEach(
    async ([serverId, commands]) => {
      await rest.put(
        Routes.applicationGuildCommands(Bun.env.DISCORD_ID, serverId),
        {
          body: commands,
        }
      );
    }
  );

  baseLogger.info(`Successfully refreshed commands!`);
  globalThis.hot_commands = cmdStore;
}

if (!globalThis.hot_client) client.login(Bun.env.DISCORD_TOKEN);
globalThis.hot_client = client;

(async function initalize() {
  await mongoose.connect(Bun.env.MONGODB_URL);
  await seedDefaults(defaultConfig);

  setConfig({
    // @ts-expect-error
    cookie: Bun.env.ROBLOX_COOKIE,
  });
})();
