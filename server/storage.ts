import { db } from "./db";
import {
  customers, appliances, serviceOrders,
  type Customer, type InsertCustomer,
  type Appliance, type InsertAppliance,
  type ServiceOrder, type InsertServiceOrder
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;

  // Appliances
  getAppliancesByCustomerId(customerId: number): Promise<Appliance[]>;
  createAppliance(appliance: InsertAppliance): Promise<Appliance>;

  // Service Orders
  getServiceOrders(): Promise<(ServiceOrder & { customer: Customer, appliance: Appliance })[]>;
  getServiceOrder(id: number): Promise<(ServiceOrder & { customer: Customer, appliance: Appliance }) | undefined>;
  createServiceOrder(order: InsertServiceOrder): Promise<ServiceOrder>;
  updateServiceOrder(id: number, order: Partial<InsertServiceOrder>): Promise<ServiceOrder | undefined>;

  // Stats
  getStats(): Promise<{
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    statusDistribution: Record<string, number>;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Customers
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const [customer] = await db.insert(customers).values(insertCustomer).returning();
    return customer;
  }

  async updateCustomer(id: number, updateData: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  // Appliances
  async getAppliancesByCustomerId(customerId: number): Promise<Appliance[]> {
    return await db.select().from(appliances).where(eq(appliances.customerId, customerId));
  }

  async createAppliance(insertAppliance: InsertAppliance): Promise<Appliance> {
    const [appliance] = await db.insert(appliances).values(insertAppliance).returning();
    return appliance;
  }

  // Service Orders
  async getServiceOrders(): Promise<(ServiceOrder & { customer: Customer, appliance: Appliance })[]> {
    const rows = await db
      .select({
        serviceOrder: serviceOrders,
        customer: customers,
        appliance: appliances,
      })
      .from(serviceOrders)
      .innerJoin(customers, eq(serviceOrders.customerId, customers.id))
      .innerJoin(appliances, eq(serviceOrders.applianceId, appliances.id))
      .orderBy(desc(serviceOrders.entryDate));

    return rows.map((row) => ({
      ...row.serviceOrder,
      customer: row.customer,
      appliance: row.appliance,
    }));
  }

  async getServiceOrder(id: number): Promise<(ServiceOrder & { customer: Customer, appliance: Appliance }) | undefined> {
    const rows = await db
      .select({
        serviceOrder: serviceOrders,
        customer: customers,
        appliance: appliances,
      })
      .from(serviceOrders)
      .innerJoin(customers, eq(serviceOrders.customerId, customers.id))
      .innerJoin(appliances, eq(serviceOrders.applianceId, appliances.id))
      .where(eq(serviceOrders.id, id));

    if (rows.length === 0) return undefined;

    const row = rows[0];
    return {
      ...row.serviceOrder,
      customer: row.customer,
      appliance: row.appliance,
    };
  }

  async createServiceOrder(insertOrder: InsertServiceOrder): Promise<ServiceOrder> {
    const [order] = await db.insert(serviceOrders).values(insertOrder).returning();
    return order;
  }

  async updateServiceOrder(id: number, updateData: Partial<InsertServiceOrder>): Promise<ServiceOrder | undefined> {
    const [order] = await db
      .update(serviceOrders)
      .set(updateData)
      .where(eq(serviceOrders.id, id))
      .returning();
    return order;
  }

  // Stats
  async getStats() {
    const orders = await db.select().from(serviceOrders);
    
    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'Entregue' || o.status === 'Pronto').length;
    
    // Calculate total revenue from totalValue field (numeric)
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + Number(order.totalValue || 0);
    }, 0);

    const statusDistribution: Record<string, number> = {};
    orders.forEach(order => {
      statusDistribution[order.status] = (statusDistribution[order.status] || 0) + 1;
    });

    return {
      totalOrders,
      completedOrders,
      totalRevenue,
      statusDistribution
    };
  }
}

export const storage = new DatabaseStorage();
