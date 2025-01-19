import { defaultConfig } from "@constants";
import config from "schemas/config";

export async function fetchConfig<T = any>(key: string): Promise<T | null> {
  const result = await config.findOne({ key });
  return result?.value ? (result.value as T) : null;
}

export async function writeConfig<T = any>(
  key: string,
  value: T
): Promise<void> {
  await config.updateOne(
    { key },
    { $set: { value, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function seedDefaults(
  defaults: Record<string, any>
): Promise<void> {
  const keys = Object.keys(defaultConfig);

  for (const key of keys) {
    const existingConfig = await config.findOne({ key });

    if (!existingConfig) {
      await config.create({
        key,
        value: defaults[key],
        updatedAt: new Date(),
      });
    }
  }
}
