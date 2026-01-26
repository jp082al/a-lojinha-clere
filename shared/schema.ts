import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

// === CUSTOMERS ===
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true });

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// === APPLIANCES ===
export const appliances = pgTable("appliances", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  type: text("type").notNull(), // Fridge, washer, etc.
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApplianceSchema = createInsertSchema(appliances).omit({ id: true, createdAt: true });

export type Appliance = typeof appliances.$inferSelect;
export type InsertAppliance = z.infer<typeof insertApplianceSchema>;

// === SERVICE ORDERS ===
export const serviceOrders = pgTable("service_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  applianceId: integer("appliance_id").notNull(),
  defect: text("defect").notNull(),
  diagnosis: text("diagnosis"),
  status: text("status").notNull().default("Recebido"), // Recebido, Em análise, Aguardando peça, Em reparo, Pronto, Entregue
  serviceValue: numeric("service_value").default("0"),
  partsValue: numeric("parts_value").default("0"),
  totalValue: numeric("total_value").default("0"),
  partsDescription: text("parts_description"),
  paymentMethod: text("payment_method"),
  warrantyDays: integer("warranty_days").default(90),
  entryDate: timestamp("entry_date").defaultNow(),
  exitDate: timestamp("exit_date"),
  trackingToken: text("tracking_token"),
  finalStatus: text("final_status"),
  finalizedBy: text("finalized_by"),
  deliveredTo: text("delivered_to"),
  finalNotes: text("final_notes"),
  // Budget (Orçamento) fields
  budgetStatus: text("budget_status"), // null, AGUARDANDO_APROVACAO, APROVADO, RECUSADO
  budgetValidityDays: integer("budget_validity_days").default(7),
  budgetNotes: text("budget_notes"),
  budgetSentAt: timestamp("budget_sent_at"),
  budgetApprovedAt: timestamp("budget_approved_at"),
  budgetApprovedBy: text("budget_approved_by"),
});

export const insertServiceOrderSchema = createInsertSchema(serviceOrders).omit({ id: true, entryDate: true });

export type ServiceOrder = typeof serviceOrders.$inferSelect;
export type InsertServiceOrder = z.infer<typeof insertServiceOrderSchema>;


// === RELATIONS ===
export const customersRelations = relations(customers, ({ many }) => ({
  appliances: many(appliances),
  serviceOrders: many(serviceOrders),
}));

export const appliancesRelations = relations(appliances, ({ one, many }) => ({
  customer: one(customers, {
    fields: [appliances.customerId],
    references: [customers.id],
  }),
  serviceOrders: many(serviceOrders),
}));

export const serviceOrdersRelations = relations(serviceOrders, ({ one }) => ({
  customer: one(customers, {
    fields: [serviceOrders.customerId],
    references: [customers.id],
  }),
  appliance: one(appliances, {
    fields: [serviceOrders.applianceId],
    references: [appliances.id],
  }),
}));
