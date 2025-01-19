import { Cronitor } from "cronitor";

export const cronitor = new Cronitor(Bun.env.CRONITOR_KEY);