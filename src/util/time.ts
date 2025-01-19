import { Message } from "discord.js";
import {
  parse,
  add,
  isBefore,
  differenceInYears,
  differenceInMonths,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
} from "date-fns";

class Plural {
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  toString(formatSpec: string): string {
    const [singular, plural] = formatSpec.split("|");
    return Math.abs(this.value) !== 1
      ? `${this.value} ${plural || `${singular}s`}`
      : `${this.value} ${singular}`;
  }
}

export class ShortTime {
  dt: Date;

  constructor(argument: string, now: Date = new Date()) {
    const regex =
      /(?:(\d+)\s*(?:year|y))?(?:(\d{1,2})\s*(?:month|mo))?(?:(\d{1,4})\s*(?:week|w))?(?:(\d{1,5})\s*(?:day|d))?(?:(\d{1,5})\s*(?:hour|h))?(?:(\d{1,5})\s*(?:minute|m))?(?:(\d{1,5})\s*(?:second|s))?/;
    const match = argument.match(regex);

    if (!match) {
      throw new Error("Invalid time format");
    }

    const timeData = {
      years: match[1] ? Number(match[1]) : 0,
      months: match[2] ? Number(match[2]) : 0,
      weeks: match[3] ? Number(match[3]) : 0,
      days: match[4] ? Number(match[4]) : 0,
      hours: match[5] ? Number(match[5]) : 0,
      minutes: match[6] ? Number(match[6]) : 0,
      seconds: match[7] ? Number(match[7]) : 0,
    };

    this.dt = add(now, {
      years: timeData.years,
      months: timeData.months,
      days: timeData.weeks * 7 + timeData.days,
      hours: timeData.hours,
      minutes: timeData.minutes,
      seconds: timeData.seconds,
    });
  }

  static async convert(ctx: Message, argument: string): Promise<ShortTime> {
    return new ShortTime(argument, ctx.createdAt);
  }
}

class HumanTime {
  dt: Date;

  constructor(argument: string, now: Date = new Date()) {
    const parsedDate = parse(argument, "yyyy-MM-dd", now);
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Invalid time provided");
    }
    this.dt = parsedDate;
  }

  static async convert(ctx: Message, argument: string): Promise<HumanTime> {
    return new HumanTime(argument, ctx.createdAt);
  }
}

class Time extends HumanTime {
  constructor(argument: string, now: Date = new Date()) {
    try {
      const shortTime = new ShortTime(argument, now);
      super(argument, now);
      this.dt = shortTime.dt;
    } catch (e) {
      super(argument, now);
    }
  }
}

class FutureTime extends Time {
  constructor(argument: string, now: Date = new Date()) {
    super(argument, now);

    if (isBefore(this.dt, now)) {
      throw new Error("This time is in the past");
    }
  }
}

class TimeTransformer {
  static async transform(interaction: any, value: string): Promise<Date> {
    const now = interaction.createdAt;
    try {
      const short = new ShortTime(value, now);
      return short.dt;
    } catch (e) {
      try {
        const human = new FutureTime(value, now);
        return human.dt;
      } catch (e) {
        throw new Error("Invalid time format");
      }
    }
  }
}

function convertToUnixTimestamp(
  timeString: string,
  now: Date = new Date()
): number {
  let parsedDate: Date;

  if (timeString.toLowerCase() === "tomorrow") {
    parsedDate = add(now, { days: 1 });
  } else if (timeString.toLowerCase() === "yesterday") {
    parsedDate = add(now, { days: -1 });
  } else {
    parsedDate = parse(timeString, "yyyy-MM-dd", now);
    if (isNaN(parsedDate.getTime())) {
      throw new Error("Invalid time format");
    }
  }

  return Math.floor(parsedDate.getTime() / 1000);
}

function humanTimedelta(
  dt: Date,
  now: Date = new Date(),
  accuracy: number = 3,
  brief: boolean = false,
  suffix: boolean = true
): string {
  const output: string[] = [];

  const years = differenceInYears(now, dt);
  const months = differenceInMonths(now, dt);
  const days = differenceInDays(now, dt);
  const hours = differenceInHours(now, dt);
  const minutes = differenceInMinutes(now, dt);
  const seconds = differenceInSeconds(now, dt);

  const attrs = [
    { unit: "year", abbr: "y", value: years },
    { unit: "month", abbr: "mo", value: months },
    { unit: "day", abbr: "d", value: days },
    { unit: "hour", abbr: "h", value: hours },
    { unit: "minute", abbr: "m", value: minutes },
    { unit: "second", abbr: "s", value: seconds },
  ];

  attrs.forEach(({ unit, abbr, value }) => {
    if (value > 0) {
      output.push(
        brief ? `${value}${abbr}` : `${value} ${unit}${value > 1 ? "s" : ""}`
      );
    }
  });

  if (accuracy !== undefined) {
    output.splice(accuracy);
  }

  return output.length === 0
    ? "now"
    : output.join(", ") + (suffix ? " ago" : "");
}
