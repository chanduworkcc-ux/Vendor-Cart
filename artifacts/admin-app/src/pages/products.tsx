import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Plus, Pencil, Trash2, Loader2, ImagePlus, X, Tag, Search, FolderPlus } from "lucide-react";
import { format } from "date-fns";

const BASE = "";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  draft: "bg-yellow-100 text-yellow-800",
  archived: "bg-gray-100 text-gray-800",
};

interface Product {
  id: number; name: string; description?: string | null; images: string[];
  category?: string | null; price: number; discountPrice?: number | null;
  badge?: string | null; stock: number; status: string; createdAt: string;
}
interface Category { id: number; name: string; }

const EMPTY_FORM = {
  name: "", description: "", images: [] as string[], category: "", price: "",
  discountPrice: "", badge: "", stock: "0", status: "active",
};

export default function Products() {
  const { token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [imageInput, setImageInput] = useState("");
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["admin-products", filterStatus],
    queryFn: async () => {
      const params = filterStatus !== "all" ? `?status=${filterStatus}` : "";
      const res = await fetch(`${BASE}/api/products${params}`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
  });

  const { data: catsData, refetch: refetchCats } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/categories`, { headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    enabled: !!token,
  });

  const products: Product[] = productsData?.data || [];
  const categories: Category[] = catsData?.data || [];

  const filtered = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY_FORM }); setImageInput(""); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description || "", images: [...p.images], category: p.category || "", price: String(p.price), discountPrice: p.discountPrice ? String(p.discountPrice) : "", badge: p.badge || "", stock: String(p.stock), status: p.status });
    setImageInput("");
    setShowForm(true);
  };

  const addImage = () => {
    const url = imageInput.trim();
    if (!url) return;
    setForm(f => ({ ...f, images: [...f.images, url] }));
    setImageInput("");
  };

  const removeImage = (i: number) => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { toast({ title: "Valid price required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        images: form.images,
        category: form.category.trim() || null,
        price: parseFloat(form.price),
        discountPrice: form.discountPrice ? parseFloat(form.discountPrice) : null,
        badge: form.badge.trim() || null,
        stock: parseInt(form.stock) || 0,
        status: form.status,
      };
      const url = editing ? `${BASE}/api/products/${editing.id}` : `${BASE}/api/products`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: editing ? "Product updated" : "Product created" });
      setShowForm(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteProduct = async (id: number) => {
    try {
      const res = await fetch(`${BASE}/api/products/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast({ title: "Product deleted" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    setAddingCat(true);
    try {
      const res = await fetch(`${BASE}/api/categories`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: newCat.trim() }) });
      if (!res.ok) throw new Error((await res.json()).error);
      refetchCats();
      setNewCat("");
      toast({ title: "Category added" });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setAddingCat(false); }
  };

  const deleteCategory = async (id: number) => {
    try {
      await fetch(`${BASE}/api/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      refetchCats();
      toast({ title: "Category removed" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Package className="h-8 w-8 text-primary" /> Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog with images, categories, and discounts.</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-4">
        {["all", "active", "draft", "archived"].map(s => {
          const count = s === "all" ? products.length : products.filter(p => p.status === s).length;
          return (
            <Card key={s} className={`cursor-pointer transition-all ${filterStatus === s ? "ring-2 ring-primary" : "hover:shadow-md"}`} onClick={() => setFilterStatus(s)}>
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl font-bold text-primary">{count}</div>
                <div className="text-xs text-muted-foreground capitalize mt-0.5">{s === "all" ? "Total" : s}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Categories manager */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" /> Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-1 bg-secondary rounded-full px-3 py-1">
                <span className="text-sm">{c.name}</span>
                <button onClick={() => deleteCategory(c.id)} className="text-muted-foreground hover:text-destructive ml-1"><X className="h-3 w-3" /></button>
              </div>
            ))}
            {categories.length === 0 && <span className="text-sm text-muted-foreground">No categories yet</span>}
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input placeholder="New category name..." value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} className="h-8 text-sm" />
            <Button size="sm" variant="outline" onClick={addCategory} disabled={addingCat}>
              {addingCat ? <Loader2 className="h-3 w-3 animate-spin" /> : <FolderPlus className="h-3 w-3" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search products..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Products list */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No products found.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={openAdd}><Plus className="h-4 w-4 mr-1" /> Add your first product</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Stock</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-10 h-10 object-cover rounded-lg border" />
                          ) : (
                            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="flex gap-1 mt-0.5">
                              {p.badge && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{p.badge}</span>}
                              {p.images.length > 1 && <span className="text-xs text-muted-foreground">{p.images.length} images</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{p.category || "—"}</td>
                      <td className="py-3">
                        <div className="font-medium">₹{p.price}</div>
                        {p.discountPrice && <div className="text-xs text-green-600">Sale: ₹{p.discountPrice}</div>}
                      </td>
                      <td className="py-3">
                        <span className={p.stock === 0 ? "text-red-600 font-medium" : ""}>{p.stock === 0 ? "Out of stock" : p.stock}</span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[p.status] || ""}`}>{p.status}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{p.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteProduct(p.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit: ${editing.name}` : "Add New Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Product Name *</Label>
                <Input placeholder="e.g. Wireless Headphones" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Textarea placeholder="Brief product description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="h-20" />
              </div>
              <div className="space-y-1.5">
                <Label>Price (₹) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="e.g. 999" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Discount Price (₹)</Label>
                <Input type="number" min="0" step="0.01" placeholder="Leave blank for no discount" value={form.discountPrice} onChange={e => setForm(f => ({ ...f, discountPrice: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock Quantity</Label>
                <Input type="number" min="0" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Badge</Label>
                <Input placeholder="e.g. New, Sale, Popular" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category || "__none"} onValueChange={v => setForm(f => ({ ...f, category: v === "__none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Image gallery */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><ImagePlus className="h-4 w-4" /> Product Images</Label>
              {form.images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border" onError={e => (e.currentTarget.src = "")} />
                      <button onClick={() => removeImage(i)} className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Paste image URL and press Add..."
                  value={imageInput}
                  onChange={e => setImageInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addImage()}
                  className="text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={addImage}><Plus className="h-4 w-4" /></Button>
              </div>
              <p className="text-xs text-muted-foreground">Add image URLs from any source (Unsplash, Cloudinary, etc.). First image is the main display image.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Update Product" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
