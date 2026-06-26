import { useParams, useLocation } from "wouter";
import {
  useGetOrder,
  useUpdateOrderStatus,
  useUpdateOrderShipping,
  getListOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, ExternalLink, Loader2, Lock } from "lucide-react";

const STATUS_OPTIONS = ["pending", "processing", "shipped", "delivered", "cancelled"];

const shippingSchema = z.object({
  shippingPartner: z.string().min(1, "Shipping partner is required"),
  deliveryDate: z.string().min(1, "Delivery date is required"),
  trackingLink: z.string().url("Must be a valid URL"),
});
type ShippingFormValues = z.infer<typeof shippingSchema>;

const statusColor: Record<string, string> = {
  pending:    "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  shipped:    "bg-orange-100 text-orange-800",
  delivered:  "bg-green-100 text-green-800",
  cancelled:  "bg-red-100 text-red-800",
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(id!);
  const updateStatus = useUpdateOrderStatus();
  const updateShipping = useUpdateOrderShipping();

  const shippingForm = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    defaultValues: {
      shippingPartner: order?.shippingPartner || "",
      deliveryDate: order?.deliveryDate ? order.deliveryDate.split("T")[0] : "",
      trackingLink: order?.trackingLink || "",
    },
  });

  const handleStatusChange = (status: string) => {
    updateStatus.mutate(
      { orderId: id!, data: { status: status as any } },
      {
        onSuccess: () => {
          toast({ title: "Status updated", description: `Order marked as ${status}.` });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || err?.message || "Failed to update status.";
          const isLocked = err?.response?.status === 423 || msg.includes("locked");
          toast({
            title: isLocked ? "🔒 Order Locked" : "Error",
            description: msg,
            variant: "destructive",
          });
        },
      }
    );
  };

  const onShippingSubmit = (data: ShippingFormValues) => {
    updateShipping.mutate(
      { orderId: id!, data: { ...data, status: "shipped" } },
      {
        onSuccess: () => {
          toast({ title: "Shipping details saved", description: "Order marked as shipped and user notified." });
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || "Failed to save shipping details.";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) return (
    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );

  if (!order) return (
    <div className="text-center py-16 text-muted-foreground">Order not found.</div>
  );

  const isLocked = (order as any).isLocked === true;
  const lockedAt = (order as any).lockedAt;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{order.title}</h1>
            {isLocked && (
              <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-3 py-1 font-semibold">
                <Lock className="h-4 w-4" /> Immutable Record
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {(order as any).orderRef && <span className="font-mono mr-3">{(order as any).orderRef}</span>}
            Order #{order.id}
          </p>
        </div>
      </div>

      {/* Lock banner */}
      {isLocked && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          <Lock className="h-5 w-5 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold">This order is permanently locked</p>
            <p className="text-amber-700 mt-0.5">
              It was finalized as <strong>"{order.status}"</strong> and cannot be modified further.
              {lockedAt && ` Locked on ${format(new Date(lockedAt), "MMM d, yyyy 'at' h:mm a")}.`}
              {" "}All previous status changes are preserved in the audit log.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className={isLocked ? "opacity-90" : ""}>
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
            <CardDescription>Placed on {format(new Date(order.createdAt), "MMM d, yyyy 'at' h:mm a")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {order.description && (
              <div>
                <span className="text-muted-foreground">Description: </span>
                {order.description}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Quantity: </span>
              {order.quantity}
            </div>
            {order.totalAmount != null && (
              <div>
                <span className="text-muted-foreground">Total Amount: </span>
                ${order.totalAmount}
              </div>
            )}
            {order.notes && (
              <div>
                <span className="text-muted-foreground">Notes: </span>
                {order.notes}
              </div>
            )}
            <div className="pt-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor[order.status]}`}>
                {order.status}
              </span>
            </div>

            <div className="pt-4 border-t">
              {isLocked ? (
                <div className="flex items-center gap-2 text-amber-700 text-sm">
                  <Lock className="h-4 w-4" />
                  <span>Status updates are blocked — this order is locked.</span>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium mb-2">Update Status</p>
                  <Select value={order.status} onValueChange={handleStatusChange} disabled={updateStatus.isPending}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(order.status === "delivered" || order.status === "cancelled") && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Selecting this status will permanently lock the order.
                    </p>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={isLocked ? "opacity-90" : ""}>
          <CardHeader>
            <CardTitle>Shipping Details</CardTitle>
            <CardDescription>
              {isLocked
                ? "Shipping details are final — record is locked"
                : order.status === "shipped" || order.shippingPartner
                  ? "Shipping information on record"
                  : "Fill in to mark as shipped and notify user"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {order.shippingPartner ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Partner: </span>
                  <span className="font-medium">{order.shippingPartner}</span>
                </div>
                {order.deliveryDate && (
                  <div>
                    <span className="text-muted-foreground">Expected Delivery: </span>
                    <span className="font-medium">{format(new Date(order.deliveryDate), "MMM d, yyyy")}</span>
                  </div>
                )}
                {order.trackingLink && (
                  <div>
                    <span className="text-muted-foreground">Tracking: </span>
                    <a href={order.trackingLink} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 font-medium">
                      View tracking <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {!isLocked && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-3">Update Shipping</p>
                    <ShippingForm form={shippingForm} onSubmit={onShippingSubmit} isPending={updateShipping.isPending} />
                  </div>
                )}
              </div>
            ) : isLocked ? (
              <div className="flex items-center gap-2 text-amber-700 text-sm py-4">
                <Lock className="h-4 w-4" />
                <span>Shipping details cannot be added — order is locked.</span>
              </div>
            ) : (
              <ShippingForm form={shippingForm} onSubmit={onShippingSubmit} isPending={updateShipping.isPending} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ShippingForm({ form, onSubmit, isPending }: { form: any; onSubmit: (d: ShippingFormValues) => void; isPending: boolean }) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="shippingPartner" render={({ field }: any) => (
          <FormItem>
            <FormLabel>Shipping Partner</FormLabel>
            <FormControl><Input placeholder="DHL, FedEx, UPS..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="deliveryDate" render={({ field }: any) => (
          <FormItem>
            <FormLabel>Expected Delivery Date</FormLabel>
            <FormControl><Input type="date" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="trackingLink" render={({ field }: any) => (
          <FormItem>
            <FormLabel>Tracking Link</FormLabel>
            <FormControl><Input placeholder="https://..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save &amp; Mark as Shipped
        </Button>
      </form>
    </Form>
  );
}
