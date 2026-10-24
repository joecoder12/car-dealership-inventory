-- Business invariants enforced by the database itself. Prisma's schema language
-- cannot express CHECK constraints, so they are maintained here by hand.

-- Stock can never be negative, even if an application code path is buggy.
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_quantity_non_negative" CHECK ("quantity" >= 0);

-- Prices are strictly positive.
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_price_positive" CHECK ("price" > 0);

-- Model year is optional but must be plausible (the first car was built in 1886).
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_year_range"
  CHECK ("year" IS NULL OR "year" BETWEEN 1886 AND 2100);

-- Emails are normalised to lower case before storage, which makes the unique
-- index effectively case-insensitive.
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase" CHECK ("email" = lower("email"));

-- A purchase always moves at least one unit and has consistent pricing.
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_prices_positive"
  CHECK ("unit_price" > 0 AND "total_price" > 0);
