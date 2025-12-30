-- Migration: Changer custom_commission_rate de INTEGER à FLOAT
-- Date: 2025-12-26
-- Description: Permet d'enregistrer des taux de commission décimaux (ex: 8.5%)

-- Vérifier les données existantes avant migration
SELECT id, name, custom_commission_rate
FROM categories
WHERE custom_commission_rate IS NOT NULL;

-- Modifier le type de colonne
ALTER TABLE categories
ALTER COLUMN custom_commission_rate TYPE DOUBLE PRECISION;

-- Vérifier après migration
SELECT id, name, custom_commission_rate
FROM categories
WHERE custom_commission_rate IS NOT NULL;
