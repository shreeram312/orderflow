import type { NextFunction, Request, Response } from "express";

import { parse } from "../../lib/parse";
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
    res.status(200).json({ items: await menuService.listForKitchen(query) });
  } catch (error) {
    next(error);
  }
}

export async function getMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ item: await menuService.getById(String(req.params.id)) });
  } catch (error) {
    next(error);
  }
}

export async function createMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(createMenuItemSchema, req.body);
    res.status(201).json({ item: await menuService.create(input) });
  } catch (error) {
    next(error);
  }
}

export async function updateMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    const input = parse(updateMenuItemSchema, req.body);
    res.status(200).json({ item: await menuService.update(String(req.params.id), input) });
  } catch (error) {
    next(error);
  }
}

/** Dedicated route for the Active/Paused toggle in the kitchen list. */
export async function updateMenuItemStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = parse(updateStatusSchema, req.body);
    res.status(200).json({ item: await menuService.update(String(req.params.id), { status }) });
  } catch (error) {
    next(error);
  }
}

export async function archiveMenuItem(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ item: await menuService.archive(String(req.params.id)) });
  } catch (error) {
    next(error);
  }
}
