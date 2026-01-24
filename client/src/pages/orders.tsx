import { useState } from "react";
import { useServiceOrders, useCreateServiceOrder, useUpdateServiceOrder } from "@/hooks/use-service-orders";
import { useCustomers } from "@/hooks/use-customers";
import { useAppliances } from "@/hooks/use-appliances";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MessageSquare, Edit, Filter } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertServiceOrderSchema, type InsertServiceOrder, type ServiceOrder } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";

export default function Orders() {
  const { data: orders, isLoading } = useServiceOrders();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);

  const filteredOrders = orders?.filter(o => 
    o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.id.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h2>
          <p className="text-muted-foreground mt-2">Gerencie e acompanhe todos os serviços.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              <Plus className="mr-2 h-4 w-4" /> Nova Ordem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <OrderForm onClose={() => setIsCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Buscar por cliente ou Nº da OS..." 
          className="border-none shadow-none focus-visible:ring-0 bg-transparent text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button variant="ghost" size="icon">
          <Filter className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOrders?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
              Nenhuma ordem de serviço encontrada.
            </div>
          ) : (
            filteredOrders?.map((order) => (
              <Card 
                key={order.id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setEditingOrder(order)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-foreground">
                          #{order.id}
                        </span>
                        <StatusBadge status={order.status} />
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(order.entryDate!), "dd/MM/yyyy")}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold">{order.customer.name}</h3>
                      <p className="text-muted-foreground">
                        {order.appliance.type} {order.appliance.brand} - {order.defect}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 justify-between">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total Estimado</p>
                        <p className="text-2xl font-bold text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.totalValue))}
                        </p>
                      </div>
                      
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 w-full md:w-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          const message = `Olá ${order.customer.name}, sua OS #${order.id} está com status: ${order.status}. Total: R$ ${Number(order.totalValue).toFixed(2)}.`;
                          window.open(`https://wa.me/55${order.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editingOrder && (
            <OrderForm 
              order={editingOrder} 
              onClose={() => setEditingOrder(null)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderForm({ order, onClose }: { order?: any, onClose: () => void }) {
  const { mutate: create, isPending: isCreating } = useCreateServiceOrder();
  const { mutate: update, isPending: isUpdating } = useUpdateServiceOrder();
  const { data: customers } = useCustomers();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    order?.customerId || null
  );

  const { data: appliances } = useAppliances(selectedCustomerId || 0);

  const form = useForm<InsertServiceOrder>({
    resolver: zodResolver(insertServiceOrderSchema),
    defaultValues: order ? {
      customerId: order.customerId,
      applianceId: order.applianceId,
      defect: order.defect,
      diagnosis: order.diagnosis || "",
      status: order.status,
      serviceValue: order.serviceValue,
      partsValue: order.partsValue,
      totalValue: order.totalValue
    } : {
      defect: "",
      diagnosis: "",
      status: "Recebido",
      serviceValue: "0",
      partsValue: "0",
      totalValue: "0"
    }
  });

  // Calculate total automatically
  const serviceVal = form.watch("serviceValue");
  const partsVal = form.watch("partsValue");
  
  // Update total value when parts or service value changes
  // We use useEffect or simple calculation here, but for simplicity we rely on manual input or calculate before submit
  // Ideally, totalValue should be calculated.
  
  const onSubmit = (data: InsertServiceOrder) => {
    // Recalculate total just in case
    const total = (Number(data.serviceValue) + Number(data.partsValue)).toString();
    const finalData = { ...data, totalValue: total };

    if (order) {
      update({ id: order.id, ...finalData }, { onSuccess: onClose });
    } else {
      create(finalData, { onSuccess: onClose });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{order ? `Editar OS #${order.id}` : "Nova Ordem de Serviço"}</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select 
                    onValueChange={(val) => {
                      field.onChange(Number(val));
                      setSelectedCustomerId(Number(val));
                      form.setValue("applianceId", 0); // Reset appliance
                    }}
                    defaultValue={field.value?.toString()}
                    disabled={!!order}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="applianceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aparelho</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(Number(val))}
                    defaultValue={field.value?.toString()}
                    disabled={!selectedCustomerId || !!order}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedCustomerId ? "Selecione o aparelho" : "Selecione um cliente primeiro"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {appliances?.map((a) => (
                        <SelectItem key={a.id} value={a.id.toString()}>
                          {a.type} {a.brand} ({a.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="defect"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Defeito Relatado</FormLabel>
                <FormControl>
                  <Textarea placeholder="Descreva o problema..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {order && (
             <FormField
             control={form.control}
             name="diagnosis"
             render={({ field }) => (
               <FormItem>
                 <FormLabel>Diagnóstico Técnico</FormLabel>
                 <FormControl>
                   <Textarea placeholder="Diagnóstico do técnico..." {...field} value={field.value || ""} />
                 </FormControl>
                 <FormMessage />
               </FormItem>
             )}
           />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Recebido">Recebido</SelectItem>
                      <SelectItem value="Em análise">Em análise</SelectItem>
                      <SelectItem value="Aguardando peça">Aguardando peça</SelectItem>
                      <SelectItem value="Em reparo">Em reparo</SelectItem>
                      <SelectItem value="Pronto">Pronto</SelectItem>
                      <SelectItem value="Entregue">Entregue</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="serviceValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mão de Obra (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="partsValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peças (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
             <span className="font-semibold">Total Estimado:</span>
             <span className="text-xl font-bold text-primary">
               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                 Number(form.watch("serviceValue") || 0) + Number(form.watch("partsValue") || 0)
               )}
             </span>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando..." : (order ? "Atualizar OS" : "Criar OS")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
