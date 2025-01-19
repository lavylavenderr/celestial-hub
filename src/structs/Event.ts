import { Client, type ClientEvents } from 'discord.js';

export class Event<T extends keyof ClientEvents> {
  constructor(
    public type: 'on' | 'once',
    public event: T,
    public fn: (...args: ClientEvents[T]) => void
  ) {}
}

export function singleEvent<T extends keyof ClientEvents>(
  event: T,
  fn: (...args: ClientEvents[T]) => void
): Event<T> {
  return new Event('once', event, fn);
}

export function onEvent<T extends keyof ClientEvents>(
  event: T,
  fn: (...args: ClientEvents[T]) => void
): Event<T> {
  return new Event('on', event, fn);
}
