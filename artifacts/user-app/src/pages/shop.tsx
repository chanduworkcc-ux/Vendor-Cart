import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Search, ShoppingCart, Package, Tag, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { getListOrdersQueryKey } from "@workspace/api-client-react";

interface Product {
  id: number;
  name: string;
  description: string | null;
  images: string[];
  category: string | null;
  price: number;
  discountPrice: number | null;
  badge: string | null;
  stock: number;
  status: string;
}

interface Category {
  id: number;
  name: string;
}

const POLICY_TEXT = "No Refund · No Exchange · No Return";

export default function Shop() {
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [placing, setPlacing] = useState(false);

  const { data: productsData, isLoading: productsLoading } = useQuery<{ data: Product[] }>({
    queryKey: ["shop-products", selectedCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      if (search) params.set("search", search);
      const res = await fetch(`/api/products?${params}`);
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    },
  });

  const { data: categoriesData } = useQuery<{ data: Category[] }>({
    queryKey: ["shop-categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json();
    },
  });

  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];

  const handlePlaceOrder = async () => {
    if (!selectedProduct) return;
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: selectedProduct.name,
          description: selectedProduct.description || undefined,
          notes: orderNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({
        title: "Order placed!",
        description: `Your order for "${selectedProduct.name}" has been submitted.`,
      });
      queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
      setSelectedProduct(null);
      setOrderNotes("");
    } catch (e: any) {
      toast({ title: "Order failed", description: e.message, variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  const displayPrice = (product: Product) =>
    product.discountPrice ? product.discountPrice : product.price;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
        <p className="text-muted-foreground mt-1">Browse our catalog and place an order.</p>
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={selectedCategory === cat.name ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.name)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {productsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground flex flex-col items-center">
          <Package className="h-12 w-12 text-muted mb-4" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm">Try a different search or category.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-200 flex flex-col h-full">
                {/* Image */}
                <div className="relative bg-muted aspect-[4/3] overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "";
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  {product.badge && (
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                      {product.badge}
                    </Badge>
                  )}
                  {product.discountPrice && (
                    <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                      Sale
                    </Badge>
                  )}
                </div>

                <CardContent className="flex-1 p-4 space-y-2">
                  {product.category && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      {product.category}
                    </div>
                  )}
                  <h3 className="font-semibold text-base leading-tight">{product.name}</h3>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-lg font-bold text-primary">
                      ₹{displayPrice(product).toFixed(2)}
                    </span>
                    {product.discountPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        ₹{product.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {product.stock <= 5 && product.stock > 0 && (
                    <p className="text-xs text-orange-600 font-medium">Only {product.stock} left!</p>
                  )}
                  {product.stock === 0 && (
                    <p className="text-xs text-red-500 font-medium">Out of stock</p>
                  )}
                  {/* Policy notice — mandatory on every product */}
                  <p className="text-[11px] font-bold text-red-600 pt-1">{POLICY_TEXT}</p>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Button
                    className="w-full"
                    disabled={product.stock === 0}
                    onClick={() => { setSelectedProduct(product); setOrderNotes(""); }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {product.stock === 0 ? "Out of Stock" : "Order Now"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Order Confirmation Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Place Order</DialogTitle>
            <DialogDescription>
              Confirm your order for <strong>{selectedProduct?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4 py-2">
              <div className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                {selectedProduct.images?.[0] ? (
                  <img
                    src={selectedProduct.images[0]}
                    alt={selectedProduct.name}
                    className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{selectedProduct.name}</p>
                  {selectedProduct.category && (
                    <p className="text-xs text-muted-foreground">{selectedProduct.category}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-primary">₹{displayPrice(selectedProduct).toFixed(2)}</span>
                    {selectedProduct.discountPrice && (
                      <span className="text-xs text-muted-foreground line-through">₹{selectedProduct.price.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Special Instructions (optional)</Label>
                <Textarea
                  placeholder="e.g. Size, color, delivery preference..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="resize-none"
                  rows={3}
                />
              </div>

              {/* Mandatory policy notice — adjacent to order button */}
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-700 leading-relaxed">
                  No Refund · No Exchange · No Return — All sales are final. By confirming, you agree to our strict no-refund, no-exchange, and no-return policy.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProduct(null)} disabled={placing}>
              Cancel
            </Button>
            <Button onClick={handlePlaceOrder} disabled={placing}>
              {placing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
              Confirm Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
