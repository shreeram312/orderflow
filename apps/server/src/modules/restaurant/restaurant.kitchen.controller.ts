import type { NextFunction, Request, Response } from "express";

import { parse } from "../../lib/parse";
import { ok } from "../../lib/response";
import * as restaurantService from "./restaurant.service";
import { updateSettingsSchema } from "./restaurant.schemas";

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, { settings: await restaurantService.getSettings() });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(updateSettingsSchema, req.body);
    const settings = await restaurantService.updateSettings(input);

    ok(res, { settings }, settings.isOpen ? "Restaurant is open" : "Restaurant is closed");
  } catch (error) {
    next(error);
  }
}
