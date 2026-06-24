import { sql } from 'drizzle-orm';
import { db } from '@workspace/db';

export class Storage {
  async listProductsWithPrices(limit = 20, offset = 0, category?: string) {
    const categoryFilter = category
      ? sql`AND p.metadata->>'category' = ${category}`
      : sql``;

    const result = await db.execute(
      sql`
        WITH paginated_products AS (
          SELECT id, name, description, active, images, metadata
          FROM stripe.products
          WHERE active = true
          ${categoryFilter}
          ORDER BY created DESC
          LIMIT ${limit} OFFSET ${offset}
        )
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.images as product_images,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.active as price_active
        FROM paginated_products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        ORDER BY p.name, pr.unit_amount
      `
    );

    const productsMap = new Map<string, any>();
    for (const row of result.rows as any[]) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          description: row.product_description ?? null,
          active: row.product_active,
          images: row.product_images ?? [],
          metadata: row.product_metadata ?? {},
          prices: [],
        });
      }
      if (row.price_id) {
        productsMap.get(row.product_id).prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount ?? null,
          currency: row.currency,
          active: row.price_active,
        });
      }
    }

    return Array.from(productsMap.values());
  }

  async getProductWithPrices(productId: string) {
    const result = await db.execute(
      sql`
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.images as product_images,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.id = ${productId}
        ORDER BY pr.unit_amount
      `
    );

    if (result.rows.length === 0) return null;

    const rows = result.rows as any[];
    const first = rows[0];
    const product = {
      id: first.product_id,
      name: first.product_name,
      description: first.product_description ?? null,
      active: first.product_active,
      images: first.product_images ?? [],
      metadata: first.product_metadata ?? {},
      prices: [] as any[],
    };

    for (const row of rows) {
      if (row.price_id) {
        product.prices.push({
          id: row.price_id,
          unit_amount: row.unit_amount ?? null,
          currency: row.currency,
          active: row.price_active,
        });
      }
    }

    return product;
  }

  async listCategories(): Promise<string[]> {
    const result = await db.execute(
      sql`
        SELECT DISTINCT metadata->>'category' as category
        FROM stripe.products
        WHERE active = true AND metadata->>'category' IS NOT NULL
        ORDER BY category
      `
    );
    return (result.rows as any[]).map((r) => r.category).filter(Boolean);
  }

  async listOrders(limit = 20) {
    const result = await db.execute(
      sql`
        SELECT
          id,
          amount,
          currency,
          status,
          created,
          customer_email as "customerEmail"
        FROM stripe.payment_intents
        WHERE status = 'succeeded'
        ORDER BY created DESC
        LIMIT ${limit}
      `
    );
    return result.rows;
  }
}

export const storage = new Storage();
