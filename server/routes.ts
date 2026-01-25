import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, authStorage } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Auth setup MUST be first
  await setupAuth(app);
  registerAuthRoutes(app);

  // Customers
  app.get(api.customers.list.path, async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.get(api.customers.get.path, async (req, res) => {
    const customer = await storage.getCustomer(Number(req.params.id));
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  });

  app.post(api.customers.create.path, async (req, res) => {
    try {
      const input = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer(input);
      res.status(201).json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.customers.update.path, async (req, res) => {
    try {
      const input = api.customers.update.input.parse(req.body);
      const customer = await storage.updateCustomer(Number(req.params.id), input);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Appliances
  app.get(api.appliances.list.path, async (req, res) => {
    const appliances = await storage.getAppliancesByCustomerId(Number(req.params.customerId));
    res.json(appliances);
  });

  app.post(api.appliances.create.path, async (req, res) => {
    try {
      const input = api.appliances.create.input.parse(req.body);
      const appliance = await storage.createAppliance(input);
      res.status(201).json(appliance);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Service Orders
  app.get(api.serviceOrders.list.path, async (req, res) => {
    const orders = await storage.getServiceOrders();
    res.json(orders);
  });

  app.get(api.serviceOrders.get.path, async (req, res) => {
    const order = await storage.getServiceOrder(Number(req.params.id));
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  });

  app.post(api.serviceOrders.create.path, async (req, res) => {
    try {
      const input = api.serviceOrders.create.input.parse(req.body);
      const order = await storage.createServiceOrder(input);
      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.serviceOrders.update.path, async (req, res) => {
    try {
      const input = api.serviceOrders.update.input.parse(req.body);
      const order = await storage.updateServiceOrder(Number(req.params.id), input);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      res.json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Stats
  app.get(api.stats.get.path, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  // Public tracking (no auth required)
  app.get('/api/tracking/:token', async (req, res) => {
    const order = await storage.getServiceOrderByToken(req.params.token);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({
      id: order.id,
      status: order.status,
      entryDate: order.entryDate,
      exitDate: order.exitDate,
      defect: order.defect,
      diagnosis: order.diagnosis,
      finalStatus: order.finalStatus,
      appliance: {
        type: order.appliance.type,
        brand: order.appliance.brand,
        model: order.appliance.model
      },
      customer: {
        name: order.customer.name.split(' ')[0]
      }
    });
  });

  // Seeding
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  // Seed default admin user
  const existingAdmin = await authStorage.getUserByUsername("admin");
  if (!existingAdmin) {
    await authStorage.createLocalUser({
      firstName: "Administrador",
      lastName: "",
      username: "admin",
      password: "admin123",
      role: "ADMIN"
    });
    console.log("Default admin user created: admin / admin123");
  }

  const existingCustomers = await storage.getCustomers();
  if (existingCustomers.length === 0) {
    const customer = await storage.createCustomer({
      name: "João da Silva",
      phone: "11999999999",
      address: "Rua das Flores, 123",
      notes: "Cliente antigo",
    });

    const appliance = await storage.createAppliance({
      customerId: customer.id,
      type: "Geladeira",
      brand: "Brastemp",
      model: "BRM50",
      serialNumber: "123456789",
    });

    await storage.createServiceOrder({
      customerId: customer.id,
      applianceId: appliance.id,
      defect: "Não gela",
      diagnosis: "Falta de gás",
      status: "Em reparo",
      serviceValue: "150.00",
      partsValue: "50.00",
      totalValue: "200.00",
    });

    // Add more seed data
    const customer2 = await storage.createCustomer({
      name: "Maria Oliveira",
      phone: "11988888888",
      address: "Av. Paulista, 1000",
      notes: "",
    });

    const appliance2 = await storage.createAppliance({
      customerId: customer2.id,
      type: "Micro-ondas",
      brand: "Electrolux",
      model: "MEF41",
      serialNumber: "987654321",
    });

    await storage.createServiceOrder({
      customerId: customer2.id,
      applianceId: appliance2.id,
      defect: "Não liga",
      diagnosis: "Fusível queimado",
      status: "Pronto",
      serviceValue: "80.00",
      partsValue: "10.00",
      totalValue: "90.00",
    });
  }
}
