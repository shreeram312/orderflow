import type { NextFunction, Request, Response } from "express";

import { parse } from "../../lib/parse";
import { created, ok } from "../../lib/response";
import * as menuService from "./menu.service";
import {
  createMenuItemSchema,
  listMenuQuerySchema,
  updateMenuItemSchema,
  updateStatusSchema,
} from "./menu.schemas";

export async function listMenu(req: Request, res: Response, next: NextFunction) {
  try {
    const query = parse(listMenuQuerySchema, req.query);
    ok(res, { items: await menuService.listForKitchen(query) });
  } catch (error) {
    next(error);
  }
}

export async function getMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, { item: await menuService.getById(String(req.params.id)) });
  } catch (error) {
    next(error);
  }
}

export async function createMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(createMenuItemSchema, req.body);
    created(res, { item: await menuService.create(input) }, "Menu item added");
  } catch (error) {
    next(error);
  }
}

export async function updateMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(updateMenuItemSchema, req.body);
    ok(res, { item: await menuService.update(String(req.params.id), input) }, "Menu item updated");
  } catch (error) {
    next(error);
  }
}

/** Dedicated route for the Active/Paused toggle in the kitchen list. */
export async function updateMenuItemStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = parse(updateStatusSchema, req.body);
    const item = await menuService.update(String(req.params.id), { status });

    ok(res, { item }, status === "ACTIVE" ? "Item resumed" : "Item paused");
  } catch (error) {
    next(error);
  }
}

export async function archiveMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    ok(res, { item: await menuService.archive(String(req.params.id)) }, "Menu item archived");
  } catch (error) {
    next(error);
  }
}
