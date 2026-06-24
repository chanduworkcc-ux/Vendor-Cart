import { Router, type IRouter } from 'express';
import { storage } from '../storage';
import { getUncachableStripeClient } from '../stripeClient';

const router: IRouter = Router();

router.get('/products', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;
    const category = req.query.category as string | undefined;
    const products = await storage.listProductsWithPrices(limit, offset, category);
    res.json({ data: products });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/products/:productId', async (req, res) => {
  try {
    const product = await storage.getProductWithPrices(req.params.productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json(product);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/categories', async (_req, res) => {
  try {
    const categories = await storage.listCategories();
    res.json({ data: categories });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/checkout/session', async (req, res) => {
  try {
    const { lineItems, successUrl, cancelUrl } = req.body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return res.status(400).json({ error: 'lineItems is required and must be a non-empty array' });
    }

    const stripe = await getUncachableStripeClient();
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0] ?? 'localhost';
    const base = `https://${domain}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems.map((item: { priceId: string; quantity?: number }) => ({
        price: item.priceId,
        quantity: item.quantity ?? 1,
      })),
      mode: 'payment',
      success_url: successUrl ?? `${base}/checkout/success`,
      cancel_url: cancelUrl ?? `${base}/checkout/cancel`,
    });

    return res.json({ url: session.url!, sessionId: session.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/orders', async (_req, res) => {
  try {
    const orders = await storage.listOrders();
    res.json({ data: orders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
