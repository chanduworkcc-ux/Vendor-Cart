import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Pencil, Tag, Gift, Check, X } from "lucide-react";
import { format } from "date-fns";

const BASE = "";

const TYPE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  public:       { label: "Public", color: "bg-blue-100 text-blue-800", desc: "All users can see & use" },
  private:      { label: "Private", color: "bg-purple-100 text-purple-800", desc: "Assigned to one specific user" },
  new_user:     { label: "New Users", color: "bg-green-100 text-green-800", desc: "Only users who've never used a coupon" },
  special_user: { label: "Special Members", color: "bg-yellow-100 text-yellow-800", desc: "Only users with 'special' role" },
};

const EMPTY_FORM = { code: "", description: "", type: "public", discountType: "percentage", discountValue: "10", bonusCoins: "0", maxUses: "", expiresAt: "", assignedUserId: "", isActive: true };

export default function Coupons() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/admin/coupons`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!token,
  });

  const coupons = data?.data || [];
  const users = usersData?.data || [];

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(false); };

  const startEdit = (c: any) => {
    setForm({
      code: c.code, description: c.description || "", type: c.type,
      discountType: c.discountType, discountValue: String(c.discountValue),
      bonusCoins: String(c.bonusCoins), maxUses: c.maxUses ? String(c.maxUses) : "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : "",
      assignedUserId: c.assignedUserId ? String(c.assignedUserId) : "",
      isActive: c.isActive,
    });
    setEditId(c.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.code.trim()) { toast({ title: "Enter a coupon code", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const body: any = {
        code: form.code.trim().toUpperCase(), description: form.description || null,
        type: form.type, discountType: form.discountType,
        discountValue: parseInt(form.discountValue) || 10,
        bonusCoins: parseInt(form.bonusCoins) || 0,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt || null, isActive: form.isActive,
        assignedUserId: form.assignedUserId ? parseInt(form.assignedUserId) : null,
      };
      const url = editId ? `${BASE}/api/admin/coupons/${editId}` : `${BASE}/api/admin/coupons`;
      const res = await fetch(url, { method: editId ? "PATCH" : "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast({ title: editId ? "Coupon updated!" : "Coupon created!" });
      resetForm();
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const deleteCoupon = async (id: number, code: string) => {
    setDeleting(id);
    try {
      await fetch(`${BASE}/api/admin/coupons/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      toast({ title: `Coupon ${code} deleted` });
      refetch();
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setDeleting(null); }
  };

  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Tag className="h-8 w-8 text-primary" /> Coupons</h1>
          <p className="text-muted-foreground mt-1">Create and manage discount coupons for users.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Create Coupon</Button>
      </div>

      {/* Type legend */}
      <div className="flex gap-2 flex-wrap">
        {Object.entries(TYPE_LABELS).map(([k, v]) => (
          <div key={k} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${v.color} flex flex-col`}>
            <span className="font-bold">{v.label}</span>
            <span className="opacity-75">{v.desc}</span>
          </div>
        ))}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5 text-primary" /> {editId ? "Edit Coupon" : "New Coupon"}</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" disabled={!!editId} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v, assignedUserId: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">🌐 Public — all users</SelectItem>
                    <SelectItem value="private">🔒 Private — specific user</SelectItem>
                    <SelectItem value="new_user">🆕 New Users only</SelectItem>
                    <SelectItem value="special_user">⭐ Special Members only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Discount Type</Label>
                <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">% Percentage</SelectItem>
                    <SelectItem value="fixed_coins">🪙 Bonus Coins</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{form.discountType === "percentage" ? "Discount %" : "Discount Value"}</Label>
                <Input type="number" min="0" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder="10" />
              </div>
              <div className="space-y-1.5">
                <Label>Bonus Coins (on use)</Label>
                <Input type="number" min="0" value={form.bonusCoins} onChange={e => setForm(f => ({ ...f, bonusCoins: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Max Uses (blank = unlimited)</Label>
                <Input type="number" min="1" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="Unlimited" />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date & Time</Label>
                <Input type="datetime-local" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
              </div>
              {form.type === "private" && (
                <div className="space-y-1.5">
                  <Label>Assign to User</Label>
                  <Select value={form.assignedUserId} onValueChange={v => setForm(f => ({ ...f, assignedUserId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.email})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                <Label>Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <Label>{form.isActive ? "Active" : "Inactive"}</Label>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                {editId ? "Update Coupon" : "Create Coupon"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupon List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No coupons yet. Create your first coupon above.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c: any) => {
            const expired = c.expiresAt && new Date(c.expiresAt) < now;
            const exhausted = c.maxUses && c.usedCount >= c.maxUses;
            const typeInfo = TYPE_LABELS[c.type] || { label: c.type, color: "bg-gray-100 text-gray-700", desc: "" };
            return (
              <Card key={c.id} className={`relative ${!c.isActive || expired || exhausted ? "opacity-60" : ""}`}>
                <CardContent className="pt-4 pb-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg tracking-wider text-primary">{c.code}</span>
                        {!c.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        {expired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                        {exhausted && <Badge className="bg-gray-100 text-gray-700 text-xs">Used up</Badge>}
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => deleteCoupon(c.id, c.code)} disabled={deleting === c.id}>
                        {deleting === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                    {c.discountType === "percentage" ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">{c.discountValue}% OFF</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">Fixed</span>
                    )}
                    {c.bonusCoins > 0 && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">+{c.bonusCoins} 🪙</span>}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex justify-between">
                      <span>Used: {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</span>
                      {c.expiresAt && <span>Expires: {format(new Date(c.expiresAt), "MMM d, yyyy")}</span>}
                    </div>
                    {c.assignedUserName && <p>Assigned to: <strong>{c.assignedUserName}</strong></p>}
                    {c.type === "private" && !c.assignedUserId && <p className="text-orange-600">⚠ No user assigned</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
