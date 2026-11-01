import type { Request, Response, NextFunction } from "express";
import {
  // Shipping Company
  createShippingCompanyService,
  getShippingCompanyByIdService,
  getAllShippingCompaniesService,
  updateShippingCompanyByIdService,
  deleteShippingCompanyByIdService,
  // Shipping Price
  createShippingPriceService,
  getShippingPriceByIdService,
  getShippingPriceByCompanyAndWilayaService,
  getAllShippingPricesForCompanyService,
  updateShippingPriceByIdService,
  deleteShippingPriceByIdService,
  // Payload types
  type CreateShippingCompanyPayload,
  type UpdateShippingCompanyPayload,
  type CreateShippingPricePayload,
  type UpdateShippingPricePayload,
} from "../service/shipping.service.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function createHttpError(
  status: number,
  message: string
): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

const isNotFound = (err: unknown): boolean =>
  err instanceof Error && /not found/i.test(err.message);

const isDuplicateCompanyName = (err: unknown): boolean =>
  err instanceof Error &&
  "code" in err &&
  (err as NodeJS.ErrnoException).code === "DUPLICATE_COMPANY_NAME";

const isDuplicateShippingPrice = (err: unknown): boolean =>
  err instanceof Error &&
  "code" in err &&
  (err as NodeJS.ErrnoException).code === "DUPLICATE_SHIPPING_PRICE";

// ═════════════════════════════════════════════════════════════════════════════
// ███  SHIPPING COMPANY CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shipping/companies
// Body already validated by validateCreateShippingCompany middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new shipping company.
 * The raw `apiKey` is hashed in the service layer before persisting.
 * Returns 201 + the new company record on success.
 * Returns 409 if a company with the same name already exists.
 */
export async function createShippingCompany(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as CreateShippingCompanyPayload;
    const company = await createShippingCompanyService(payload);

    res.status(201).json({ success: true, data: company });
  } catch (error) {
    if (isDuplicateCompanyName(error)) {
      return next(createHttpError(409, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/companies
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all shipping companies.
 */
export async function getAllShippingCompanies(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companies = await getAllShippingCompaniesService();

    res.status(200).json({ success: true, data: companies });
  } catch (error) {
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/companies/:id
// Param already validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single shipping company by id.
 * Returns 404 if no company exists with the given id.
 */
export async function getShippingCompanyById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const company = await getShippingCompanyByIdService(id);

    res.status(200).json({ success: true, data: company });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/shipping/companies/:id
// Param validated by validateId(), body validated by validateUpdateShippingCompany.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partially updates a shipping company.
 * If a new `apiKey` is provided it is re-hashed before persisting.
 * Returns 200 + the updated record on success.
 * Returns 404 if no company exists with the given id.
 * Returns 409 if the new name conflicts with an existing company.
 */
export async function updateShippingCompanyById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const payload = req.body as UpdateShippingCompanyPayload;
    const company = await updateShippingCompanyByIdService(id, payload);

    res.status(200).json({ success: true, data: company });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isDuplicateCompanyName(error)) {
      return next(createHttpError(409, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/shipping/companies/:id
// Param validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes a shipping company and returns its last snapshot.
 * Returns 200 + the deleted record on success.
 * Returns 404 if no company exists with the given id.
 * Returns 409 if the company is still referenced by orders or shipping prices (FK).
 */
export async function deleteShippingCompanyById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const company = await deleteShippingCompanyByIdService(id);

    res.status(200).json({ success: true, data: company });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    // Postgres FK violation (23503) – the company still owns price rows or orders.
    if (
      error instanceof Error &&
      error.message.toLowerCase().includes("foreign key")
    ) {
      return next(
        createHttpError(
          409,
          "Cannot delete a shipping company that still has orders or shipping prices"
        )
      );
    }
    next(error);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ███  SHIPPING PRICE CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/shipping/prices
// Body already validated by validateCreateShippingPrice middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new shipping price for a (company, wilaya) pair.
 * Accepts company/wilaya by name OR by numeric id/code.
 * Returns 201 + the new price record on success.
 * Returns 404 if the referenced company or wilaya does not exist.
 * Returns 409 if a price for this (company, wilaya) pair already exists.
 */
export async function createShippingPrice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const payload = req.body as CreateShippingPricePayload;
    const price = await createShippingPriceService(payload);

    res.status(201).json({ success: true, data: price });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isDuplicateShippingPrice(error)) {
      return next(createHttpError(409, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/prices/:id
// Param already validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a single shipping price by its primary key id.
 * Returns 404 if no row exists with the given id.
 */
export async function getShippingPriceById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const price = await getShippingPriceByIdService(id);

    res.status(200).json({ success: true, data: price });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/companies/:id/prices
// Returns all shipping prices (one per wilaya) for the given company.
// Param already validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all shipping price rows for a specific shipping company.
 * Returns 404 if the company does not exist.
 */
export async function getAllShippingPricesForCompany(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const companyId = Number(req.params.id);
    const prices = await getAllShippingPricesForCompanyService(companyId);

    res.status(200).json({ success: true, data: prices });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/shipping/prices/lookup
// Query: ?companyId=1&wilayaCode=16  OR  ?companyName=Foo&wilayaName=Alger
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Looks up the shipping price for a specific (company, wilaya) pair without
 * needing to know the price row's id.  Accepts either ids or names as query
 * parameters.
 *
 * Returns 200 + the price record on success.
 * Returns 404 if no matching price is found.
 */
export async function getShippingPriceByCompanyAndWilaya(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      companyId,
      companyName,
      wilayaCode,
      wilayaName,
    } = req.query as Record<string, string | undefined>;

    const price = await getShippingPriceByCompanyAndWilayaService({
      shippingCompanyId: companyId ? Number(companyId) : undefined,
      shippingCompanyName: companyName,
      wilayaCode,
      wilayaName,
    });

    res.status(200).json({ success: true, data: price });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/shipping/prices/:id
// Param validated by validateId(), body validated by validateUpdateShippingPrice.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Partially updates a shipping price row.
 * Returns 200 + the updated record on success.
 * Returns 404 if the price row (or a referenced company/wilaya) does not exist.
 * Returns 409 if the new (company, wilaya) pair conflicts with an existing row.
 */
export async function updateShippingPriceById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const payload = req.body as UpdateShippingPricePayload;
    const price = await updateShippingPriceByIdService(id, payload);

    res.status(200).json({ success: true, data: price });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    if (isDuplicateShippingPrice(error)) {
      return next(createHttpError(409, (error as Error).message));
    }
    next(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/shipping/prices/:id
// Param validated by validateId() middleware.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deletes a shipping price row and returns its last snapshot.
 * Returns 200 + the deleted record on success.
 * Returns 404 if no price row exists with the given id.
 */
export async function deleteShippingPriceById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const price = await deleteShippingPriceByIdService(id);

    res.status(200).json({ success: true, data: price });
  } catch (error) {
    if (isNotFound(error)) {
      return next(createHttpError(404, (error as Error).message));
    }
    next(error);
  }
}
