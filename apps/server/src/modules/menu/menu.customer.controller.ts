import type { NextFunction, Request, Response } from "express";

import * as restaurantService from "../restaurant/restaurant.service";
import * as menuService from "./menu.service";

/**
 * The customer's view of the menu: only what can be ordered right now, plus
 * whether the restaurant is taking orders at all.
 *
 * This response is a snapshot and goes stale the moment the kitchen pauses an
 * item — which is exactly the condition the asynchronous rejection path exists
 * to handle later.
 */
export async function getMenu(_req: Request, res: Response, next: NextFunction) {
  try {
    const [items, settings] = await Promise.all([
      menuService.listForCustomers(),
      restaurantService.getSettings(),
    ]);

    res.status(200).json({ isOpen: settings.isOpen, items });
  } catch (error) {
    next(error);
  }
}
