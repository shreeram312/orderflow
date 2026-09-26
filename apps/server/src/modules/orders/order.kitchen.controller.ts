import type { NextFunction, Request, Response } from "express";

import { parse } from "../../lib/parse";
import { ok } from "../../lib/response";
import * as orderService from "./order.service";
import {
  listKitchenOrdersQuerySchema,
  updateOrderStatusSchema,
} from "./order.schemas";

export async function listOrders(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const query = parse(listKitchenOrdersQuerySchema, req.query);
    ok(res, { orders: await orderService.listForKitchen(query) });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { status } = parse(updateOrderStatusSchema, req.body);
    const order = await orderService.updateStatusFromKitchen(
      String(req.params.id),
      status,
    );

    ok(res, { order }, `Order marked ${status.toLowerCase()}`);
  } catch (error) {
    next(error);
  }
}
