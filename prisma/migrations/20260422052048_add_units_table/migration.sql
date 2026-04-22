-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "permissions" TEXT,
    "hashed_password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "gstin" TEXT,
    "company_name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "hsn_code" TEXT NOT NULL,
    "description" TEXT,
    "category_id" TEXT NOT NULL,
    "brand" TEXT,
    "cgst_percent" DECIMAL NOT NULL DEFAULT 0,
    "sgst_percent" DECIMAL NOT NULL DEFAULT 0,
    "igst_percent" DECIMAL NOT NULL DEFAULT 0,
    "tax_inclusive" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "barcode" TEXT NOT NULL,
    "sku" TEXT,
    "cost_price" DECIMAL NOT NULL,
    "selling_price" DECIMAL NOT NULL,
    "mrp" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "product_variant_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_variant_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "variant_sku" TEXT,
    "hsn_code" TEXT,
    "batch_no" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "purchase_item_id" TEXT,
    "purchase_no" TEXT,
    "vendor_name" TEXT,
    "purchase_date" DATETIME,
    "purchase_price" DECIMAL NOT NULL,
    "selling_price" DECIMAL,
    "cgst_percent" DECIMAL NOT NULL,
    "sgst_percent" DECIMAL NOT NULL,
    "igst_percent" DECIMAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remaining_quantity" INTEGER NOT NULL,
    "manufacture_date" DATETIME,
    "expiry_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "batches_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "batches_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unit_name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchase_no" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "vendor_name" TEXT,
    "vendor_phone" TEXT,
    "vendor_gstin" TEXT,
    "sub_total" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL NOT NULL DEFAULT 0,
    "total_amount" DECIMAL NOT NULL DEFAULT 0,
    "purchase_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "purchase_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchase_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "product_variant_id" TEXT,
    "item_name" TEXT NOT NULL,
    "item_type" TEXT NOT NULL DEFAULT 'FINISHED',
    "sku" TEXT,
    "size" TEXT,
    "color" TEXT,
    "hsn_code" TEXT,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL NOT NULL,
    "cgst_percent" DECIMAL,
    "sgst_percent" DECIMAL,
    "igst_percent" DECIMAL,
    "total" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_item_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_item_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_no" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "customer_name" TEXT,
    "customer_phone" TEXT,
    "customer_email" TEXT,
    "customer_address" TEXT,
    "sub_total" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL NOT NULL DEFAULT 0,
    "total_amount" DECIMAL NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL NOT NULL DEFAULT 0,
    "balance_due" DECIMAL NOT NULL DEFAULT 0,
    "payment_method" TEXT,
    "invoice_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "invoice_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "product_variant_id" TEXT,
    "product_name" TEXT NOT NULL,
    "product_sku" TEXT,
    "variant_sku" TEXT,
    "hsn_code" TEXT NOT NULL,
    "size" TEXT,
    "color" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "cgst_amount" DECIMAL NOT NULL DEFAULT 0,
    "sgst_amount" DECIMAL NOT NULL DEFAULT 0,
    "igst_amount" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_item_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_variant_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "variant_sku" TEXT,
    "invoice_item_id" TEXT,
    "purchase_item_id" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "stock_movement_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stock_movement_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    CONSTRAINT "stock_movement_item_stock_movement_id_fkey" FOREIGN KEY ("stock_movement_id") REFERENCES "stock_movement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "stock_adjustments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_variant_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "batch_no" TEXT,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "credit_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credit_note_no" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "total_refund" DECIMAL NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_notes_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "credit_note_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "credit_note_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "product_sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "refund_amount" DECIMAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "credit_note_item_credit_note_id_fkey" FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_audit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_phone_key" ON "vendors"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_barcode_key" ON "product_variant"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batch_no_key" ON "batches"("batch_no");

-- CreateIndex
CREATE UNIQUE INDEX "units_symbol_key" ON "units"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_purchase_no_key" ON "purchases"("purchase_no");

-- CreateIndex
CREATE INDEX "purchase_item_purchase_id_idx" ON "purchase_item"("purchase_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_no_key" ON "invoices"("invoice_no");

-- CreateIndex
CREATE UNIQUE INDEX "credit_notes_credit_note_no_key" ON "credit_notes"("credit_note_no");
