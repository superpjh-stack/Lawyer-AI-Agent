#!/bin/sh
set -e

echo "=== LexAgent DB Migration ==="

echo "Step 1: Enable pgvector extension..."
echo "CREATE EXTENSION IF NOT EXISTS vector;" | npx prisma db execute --stdin --schema ./prisma/schema.prisma

echo "Step 2: Prisma db push (sync schema)..."
npx prisma db push --accept-data-loss

echo "Step 3: HNSW index migration..."
npx prisma db execute --file ./prisma/migrations/20260311_hnsw_index/migration.sql --schema ./prisma/schema.prisma

echo "=== Migration complete ==="
