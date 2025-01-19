import { Events} from "discord.js";
import { baseLogger } from "index";
import { singleEvent } from "structs/Event";

export default singleEvent(Events.ClientReady, async (client) => {
  client.user.setPresence({
    activities: [{ name: "with Parcel!", type: 0 }],
    status: "online",
  });

  baseLogger.info(`Logged in as ${client.user.tag}!`);
});
