import type { NextFunction, Request, Response } from "express";

import { unauthenticated } from "../../lib/http-error";
import { parse } from "../../lib/parse";
import { ok } from "../../lib/response";
import * as walletService from "./wallet.service";
import { listTransactionsQuerySchema, topUpSchema } from "./wallet.schemas";

/** The wallet always belongs to the signed-in user; no id is ever taken from the request. */
function userId(req: Request): string {
  if (!req.user) throw unauthenticated();
  return req.user.userId;
}

export async function getWallet(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, { wallet: await walletService.getWallet(userId(req)) });
  } catch (error) {
    next(error);
  }
}

export async function topUp(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(topUpSchema, req.body);
    const wallet = await walletService.topUp(userId(req), input);

    ok(res, { wallet }, `₹${input.amount} added to your wallet`);
  } catch (error) {
    next(error);
  }
}

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parse(listTransactionsQuerySchema, req.query);
    ok(res, { transactions: await walletService.listTransactions(userId(req), query) });
  } catch (error) {
    next(error);
  }
}
