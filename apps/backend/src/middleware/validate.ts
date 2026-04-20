import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten()
      });
      return;
    }
    req.body = parsed.data;
    next();
  };
}
