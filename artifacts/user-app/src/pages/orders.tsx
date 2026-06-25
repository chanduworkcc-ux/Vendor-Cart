import { useState } from "react";
import { Link } from "wouter";
import { useListOrders, useGetAdminSettings, useCreateOrder, getListOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, AlertTriangle, Search, Filter } from "lucide-react";

const createOrderSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  totalAmount: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type CreateOrderValues = z.infer<typeof createOrderSchema>;

export default function Orders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: ordersData, isLoading: isOrdersLoading } = useListOrders(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const { data: settingsData } = useGetAdminSettings();
  const createOrderMutation = useCreateOrder();

  const orders = ordersData?.data || [];
  const isAcceptingOrders = settingsData?.acceptingOrders ?? true;

  const form = useForm<CreateOrderValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      title: "",
      description: "",
      quantity: 1,
      totalAmount: undefined,
      notes: "",
    },
  });

  const onSubmit = (data: CreateOrderValues) => {
    createOrderMutation.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Order Created",
          description: "Your order has been successfully submitted.",
        });
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        setIsDialogOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({
          title: "Failed to create order",
          description: error.data?.error || "An error occurred",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage and track your orders.</p>
        </div>
        
        {isAcceptingOrders && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Order</DialogTitle>
                <DialogDescription>
                  Enter the details for your new order.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title / Product Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Premium Widget" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional details about the product" 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="totalAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Amount (Optional)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min={0} placeholder="0.00" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Instructions (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any notes for the processing team" 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createOrderMutation.isPending}>
                      {createOrderMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Order
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isAcceptingOrders && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>
            We are not currently accepting new orders. Existing orders will continue to be processed.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <CardTitle>Your Orders</CardTitle>
            <CardDescription>Viewing all matching orders</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isOrdersLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-md" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Search className="h-10 w-10 text-muted mb-4" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm">Try changing your filter or create a new order.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50 font-medium text-sm text-muted-foreground">
                <div className="col-span-5 md:col-span-4">Order</div>
                <div className="col-span-3 md:col-span-2 text-right">Amount</div>
                <div className="col-span-4 md:col-span-2 text-right">Qty</div>
                <div className="hidden md:block md:col-span-2 text-right">Date</div>
                <div className="hidden md:block md:col-span-2 text-right">Status</div>
              </div>
              <div className="divide-y">
                {orders.map((order) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="col-span-5 md:col-span-4">
                        <div className="font-medium truncate">{order.title}</div>
                        <div className="text-xs text-muted-foreground truncate hidden sm:block">
                          ID: #{order.id}
                        </div>
                      </div>
                      <div className="col-span-3 md:col-span-2 text-right font-medium">
                        {order.totalAmount ? `$${order.totalAmount.toFixed(2)}` : "TBD"}
                      </div>
                      <div className="col-span-4 md:col-span-2 text-right text-muted-foreground">
                        {order.quantity}
                      </div>
                      <div className="hidden md:block md:col-span-2 text-right text-muted-foreground text-sm">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </div>
                      <div className="hidden md:block md:col-span-2 text-right">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
                          ${order.status === "pending" ? "bg-gray-100 text-gray-800" :
                            order.status === "processing" ? "bg-blue-100 text-blue-800" :
                            order.status === "shipped" ? "bg-orange-100 text-orange-800" :
                            order.status === "delivered" ? "bg-green-100 text-green-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
