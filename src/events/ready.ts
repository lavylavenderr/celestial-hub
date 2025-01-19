import { ActivityType, Events, type PresenceStatusData } from "discord.js";
import { baseLogger } from "index";
import { singleEvent } from "structs/Event";
import { fetchConfig } from "util/configStore";

export default singleEvent(Events.ClientReady, async (client) => {
  client.user.setPresence({
    activities: [{ name: "with Parcel", type: 0 }],
    status: "online",
  });

  baseLogger.info(`Logged in as ${client.user.tag}!`);
});
