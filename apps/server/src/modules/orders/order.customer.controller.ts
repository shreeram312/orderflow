import type { NextFunction, Request, Response } from "express";

import { unauthenticated } from "../../lib/http-error";
import { parse } from "../../lib/parse";
import { created, ok } from "../../lib/response";
import * as orderService from "./order.service";
import { createOrderSchema } from "./order.schemas";

function userId(req: Request): string {
  if (!req.user) throw unauthenticated();
  return req.user.userId;
}

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(createOrderSchema, req.body);
    const order = await orderService.createOrder(userId(req), input);

    created(res, { order }, "Order placed");
  } catch (error) {
    next(error);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, { orders: await orderService.listOrders(userId(req)) });
  } catch (error) {
    next(error);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, { order: await orderService.getOrder(userId(req), String(req.params.id)) });
  } catch (error) {
    next(error);
  }
}
