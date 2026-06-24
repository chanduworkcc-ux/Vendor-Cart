import { getUncachableStripeClient } from './stripeClient';

/**
 * Seed sample products into your Stripe account.
 * Run: pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 *
 * Products are only created if they don't already exist (idempotent).
 * After running, the API server will sync them via syncBackfill().
 */

const SAMPLE_PRODUCTS = [
  {
    name: 'Classic White T-Shirt',
    description: 'Premium 100% cotton crew neck tee. Soft, durable, and timeless.',
    price: 2999,
    category: 'Clothing',
    badge: 'Popular',
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600'],
  },
  {
    name: 'Minimalist Leather Wallet',
    description: 'Slim bifold wallet in full-grain leather. Holds up to 8 cards.',
    price: 4999,
    category: 'Accessories',
    images: ['https://images.unsplash.com/photo-1624805765014-cd72a5f9d44e?w=600'],
  },
  {
    name: 'Ceramic Pour-Over Coffee Set',
    description: 'Handcrafted ceramic dripper and carafe. The perfect morning ritual.',
    price: 7999,
    category: 'Home',
    badge: 'New',
    images: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600'],
  },
  {
    name: 'Wireless Noise-Cancelling Headphones',
    description: '40-hour battery, premium drivers, and foldable design for travel.',
    price: 12999,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'],
  },
  {
    name: 'Natural Soy Candle',
    description: 'Hand-poured with essential oils. 45-hour burn time. Notes of cedar and vanilla.',
    price: 2499,
    category: 'Home',
    images: ['https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600'],
  },
  {
    name: 'Running Sneakers',
    description: 'Lightweight mesh upper with responsive foam sole. Perfect for daily runs.',
    price: 8999,
    category: 'Footwear',
    badge: 'Sale',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'],
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log('Seeding products into Stripe...\n');

  for (const productData of SAMPLE_PRODUCTS) {
    // Check if already exists
    const existing = await stripe.products.search({
      query: `name:'${productData.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`  ✓ Already exists: ${productData.name}`);
      continue;
    }

    const { name, description, price, category, badge, images } = productData;

    const product = await stripe.products.create({
      name,
      description,
      images,
      metadata: {
        category,
        ...(badge ? { badge } : {}),
      },
    });

    await stripe.prices.create({
      product: product.id,
      unit_amount: price,
      currency: 'usd',
    });

    console.log(`  + Created: ${name} ($${(price / 100).toFixed(2)})`);
  }

  console.log('\nDone! Restart the API server to sync products via syncBackfill().');
}

seedProducts().catch((err) => {
  console.error('Error seeding products:', err.message);
  process.exit(1);
});
