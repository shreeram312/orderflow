import { getDb } from "../../services";
import type { UpdateSettingsInput } from "./restaurant.schemas";

const SINGLETON_ID = "singleton";

export type Settings = {
  name: string;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  updatedAt: Date;
};

/**
 * Reads the single settings row, creating it with defaults on first access.
 * upsert rather than find-then-create so two concurrent first requests cannot
 * both decide the row is missing and race to insert it.
 */
export async function getSettings(): Promise<Settings> {
  const row = await getDb().restaurantSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });

  return {
    name: row.name,
    isOpen: row.isOpen,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateSettings(input: UpdateSettingsInput): Promise<Settings> {
  const row = await getDb().restaurantSettings.upsert({
    where: { id: SINGLETON_ID },
    update: input,
    create: { id: SINGLETON_ID, ...input },
  });

  return {
    name: row.name,
    isOpen: row.isOpen,
    opensAt: row.opensAt,
    closesAt: row.closesAt,
    updatedAt: row.updatedAt,
  };
}
