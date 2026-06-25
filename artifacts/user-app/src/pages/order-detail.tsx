import { useRoute, Link } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Loader2, ArrowLeft, Package, Truck, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react";

export default function OrderDetail() {
  const [, params] = useRoute("/orders/:id");
  const orderId = params?.id ? parseInt(params.id) : 0;

  const { data: order, isLoading, error } = useGetOrder(orderId, {
    query: {
      enabled: !!orderId,
    }
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Order not found</h2>
        <p className="text-muted-foreground mt-2 mb-6">This order doesn't exist or you don't have access to it.</p>
        <Link href="/orders" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-primary/90 bg-primary text-primary-foreground h-10 px-4 py-2">
          Back to Orders
        </Link>
      </div>
    );
  }

  const timelineSteps = [
    { status: "pending", label: "Pending", icon: Clock },
    { status: "processing", label: "Processing", icon: Package },
    { status: "shipped", label: "Shipped", icon: Truck },
    { status: "delivered", label: "Delivered", icon: CheckCircle },
  ];

  // Logic to determine active step in timeline
  const statusLevels = ["pending", "processing", "shipped", "delivered"];
  const currentLevel = statusLevels.indexOf(order.status);
  
  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link 
          href="/orders" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 mb-4 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order #{order.id}</h1>
            <p className="text-muted-foreground mt-1">Placed on {format(new Date(order.createdAt), "MMMM d, yyyy")}</p>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize self-start
            ${order.status === "pending" ? "bg-gray-100 text-gray-800" :
              order.status === "processing" ? "bg-blue-100 text-blue-800" :
              order.status === "shipped" ? "bg-orange-100 text-orange-800" :
              order.status === "delivered" ? "bg-green-100 text-green-800" :
              "bg-red-100 text-red-800"
            }`}>
            {order.status}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isCancelled ? (
                <div className="flex flex-col items-center justify-center py-8 text-red-600">
                  <XCircle className="w-16 h-16 mb-4" />
                  <h3 className="text-xl font-bold">Order Cancelled</h3>
                  <p className="text-muted-foreground mt-2">This order has been cancelled.</p>
                </div>
              ) : (
                <div className="relative py-8 px-4 sm:px-12">
                  {/* Progress Line */}
                  <div className="absolute top-1/2 left-8 right-8 h-1 bg-muted -translate-y-1/2 rounded-full hidden sm:block">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out"
                      style={{ 
                        width: `${Math.max(0, currentLevel / (statusLevels.length - 1)) * 100}%` 
                      }}
                    />
                  </div>
                  
                  <div className="relative flex flex-col sm:flex-row justify-between gap-8 sm:gap-0">
                    {timelineSteps.map((step, index) => {
                      const isActive = index <= currentLevel;
                      const Icon = step.icon;
                      
                      return (
                        <div key={step.status} className="flex sm:flex-col items-center gap-4 sm:gap-2">
                          <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 bg-background z-10 transition-colors duration-300
                            ${isActive ? "border-primary text-primary" : "border-muted text-muted-foreground"}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 sm:flex-initial text-left sm:text-center">
                            <div className={`font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                              {step.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {order.notes && (
                <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm">
                  <span className="font-medium text-foreground block mb-1">Notes:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground block mb-1">Product</span>
                    <span className="font-medium">{order.title}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground block mb-1">Quantity</span>
                    <span className="font-medium">{order.quantity}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground block mb-1">Expected Amount</span>
                    <span className="font-medium">{order.totalAmount ? `$${order.totalAmount.toFixed(2)}` : "TBD"}</span>
                  </div>
                </div>
                
                {order.description && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-muted-foreground block mb-1">Description</span>
                      <span className="text-foreground">{order.description}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Shipping Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.status === "pending" || order.status === "processing" ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Shipping details will appear here once the order is processed.</p>
                </div>
              ) : isCancelled ? (
                <p className="text-sm text-muted-foreground">Shipping cancelled.</p>
              ) : (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Carrier</div>
                    <div className="font-medium">{order.shippingPartner || "Unknown"}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Expected Delivery</div>
                    <div className="font-medium">
                      {order.deliveryDate ? format(new Date(order.deliveryDate), "MMMM d, yyyy") : "Unknown"}
                    </div>
                  </div>

                  {order.trackingLink && (
                    <div className="pt-2">
                      <a 
                        href={order.trackingLink.startsWith('http') ? order.trackingLink : `https://${order.trackingLink}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                      >
                        Track Shipment
                        <ExternalLink className="ml-2 w-4 h-4" />
                      </a>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have questions about your order or need to make changes, please contact support.
              </p>
              <Button variant="outline" className="w-full">Contact Support</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
