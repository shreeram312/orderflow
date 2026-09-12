import type { NextFunction, Request, Response } from "express";

import { parse } from "../../lib/parse";
import * as restaurantService from "./restaurant.service";
import { updateSettingsSchema } from "./restaurant.schemas";

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ settings: await restaurantService.getSettings() });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(updateSettingsSchema, req.body);
    res.status(200).json({ settings: await restaurantService.updateSettings(input) });
  } catch (error) {
    next(error);
  }
}
