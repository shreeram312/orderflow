-- CreateEnum
CREATE TYPE "MenuItemStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MenuCategory" AS ENUM ('STARTERS', 'MAINS', 'SIDES', 'DESSERTS', 'BEVERAGES');

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "category" "MenuCategory" NOT NULL DEFAULT 'MAINS',
    "status" "MenuItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_veg" BOOLEAN NOT NULL DEFAULT true,
    "image_url" TEXT,
    "prep_time_minutes" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "name" TEXT NOT NULL DEFAULT 'OrderFlow Kitchen',
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "opens_at" TEXT NOT NULL DEFAULT '09:00',
    "closes_at" TEXT NOT NULL DEFAULT '23:00',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_items_status_idx" ON "menu_items"("status");

-- CreateIndex
CREATE INDEX "menu_items_category_status_idx" ON "menu_items"("category", "status");
