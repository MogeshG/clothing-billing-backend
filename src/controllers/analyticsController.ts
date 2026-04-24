import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import dayjs from "dayjs";

type Period = "today" | "week" | "month" | "year" | "all" | "custom";

const getDateRange = (period: Period, startDate?: string, endDate?: string) => {
  if (period === "custom" && startDate) {
    return {
      gte: dayjs(startDate).startOf("day").toDate(),
      lte: endDate ? dayjs(endDate).endOf("day").toDate() : dayjs().endOf("day").toDate(),
    };
  }
  const now = dayjs();
  let since: Date | undefined;
  switch (period) {
    case "today": since = now.startOf("day").toDate(); break;
    case "week": since = now.startOf("week").toDate(); break;
    case "month": since = now.startOf("month").toDate(); break;
    case "year": since = now.startOf("year").toDate(); break;
    default: since = undefined;
  }
  return since ? { gte: since } : undefined;
};

const getPreviousRange = (period: Period, currentRange: any) => {
  if (!currentRange?.gte) return undefined;
  const gte = dayjs(currentRange.gte);
  const lte = currentRange.lte ? dayjs(currentRange.lte) : dayjs();
  const diffDays = lte.diff(gte, "day");
  return {
    gte: gte.subtract(diffDays + 1, "day").toDate(),
    lte: gte.subtract(1, "day").toDate(),
  };
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as Period) || "month";
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const dateRange = getDateRange(period, startDate, endDate);
    const prevRange = dateRange ? getPreviousRange(period, dateRange) : undefined;

    const where: any = { status: "COMPLETED" };
    if (dateRange) where.invoice_date = dateRange;

    const prevWhere: any = { status: "COMPLETED" };
    if (prevRange) prevWhere.invoice_date = prevRange;

    const [
      revenueResult, prevRevenueResult,
      invoiceCount, prevInvoiceCount,
      totalCustomers, newCustomers,
      totalInvoices, avgOrderResult,
    ] = await Promise.all([
      prisma.invoices.aggregate({ where, _sum: { total_amount: true } }),
      prisma.invoices.aggregate({ where: prevWhere, _sum: { total_amount: true } }),
      prisma.invoices.count({ where }),
      prisma.invoices.count({ where: prevWhere }),
      prisma.customers.count({ where: { is_deleted: false } }),
      prisma.customers.count({ where: { is_deleted: false, ...(dateRange ? { created_at: dateRange } : {}) } }),
      prisma.invoices.count({ where: { status: "COMPLETED" } }),
      prisma.invoices.aggregate({ where, _avg: { total_amount: true } }),
    ]);

    const revenue = Number(revenueResult._sum.total_amount || 0);
    const prevRevenue = Number(prevRevenueResult._sum.total_amount || 0);
    const revenueGrowth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : null;
    const orderGrowth = prevInvoiceCount > 0 ? ((invoiceCount - prevInvoiceCount) / prevInvoiceCount) * 100 : null;

    res.json({
      revenue, revenueGrowth, invoiceCount, orderGrowth,
      totalCustomers, newCustomers, totalInvoices,
      avgOrderValue: Number(avgOrderResult._avg.total_amount || 0),
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
};

export const getSalesReport = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as Period) || "month";
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const dateRange = getDateRange(period, startDate, endDate);

    let groupFormat = "YYYY-MM-DD";
    if (period === "year" || period === "all") groupFormat = "YYYY-MM";
    if (period === "today") groupFormat = "HH";

    // For custom ranges spanning > 60 days, group by month
    if (period === "custom" && startDate && endDate) {
      const diff = dayjs(endDate).diff(dayjs(startDate), "day");
      if (diff > 60) groupFormat = "YYYY-MM";
    }

    const where: any = { status: "COMPLETED" };
    if (dateRange) where.invoice_date = dateRange;

    const sales = await prisma.invoices.findMany({
      where,
      select: { invoice_date: true, total_amount: true },
      orderBy: { invoice_date: "asc" },
    });

    const grouped: Record<string, number> = {};
    sales.forEach((s) => {
      const key = dayjs(s.invoice_date).format(groupFormat);
      grouped[key] = (grouped[key] || 0) + Number(s.total_amount);
    });

    res.json(Object.entries(grouped).map(([date, amount]) => ({ date, amount })));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch sales report" });
  }
};

export const getTopProducts = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as Period) || "month";
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const limit = parseInt(req.query.limit as string) || 5;

    const dateRange = getDateRange(period, startDate, endDate);
    const invoiceWhere: any = { status: "COMPLETED" };
    if (dateRange) invoiceWhere.invoice_date = dateRange;

    const completedInvoiceIds = (
      await prisma.invoices.findMany({ where: invoiceWhere, select: { id: true } })
    ).map((i) => i.id);

    const topItems = await prisma.invoice_item.groupBy({
      by: ["product_name"],
      where: { invoice_id: { in: completedInvoiceIds } },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    res.json(topItems.map((item) => ({
      name: item.product_name,
      quantity: Number(item._sum.quantity || 0),
      revenue: Number(item._sum.total || 0),
    })));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch top products" });
  }
};

export const getLowStockAlerts = async (req: Request, res: Response) => {
  try {
    const threshold = await prisma.preferences.findUnique({
      where: { key: "lowStockThreshold" },
    });
    const results = await prisma.batches.groupBy({
      by: ["product_name"],
      _sum: {
        remaining_quantity: true,
      },
      having: {
        remaining_quantity: {
          _sum: {
            lt: Number(threshold?.value),
          },
        },
      },
      orderBy: {
        _sum: {
          remaining_quantity: "asc",
        },
      },
      take: 20,
    });

    res.json(results.map(r => ({
      product_name: r.product_name,
      remaining_quantity: Number(r._sum.remaining_quantity || 0)
    })));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch low stock alerts" });
  }
};

export const getRevenueByPaymentMethod = async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as Period) || "month";
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const dateRange = getDateRange(period, startDate, endDate);
    const where: any = { status: "COMPLETED" };
    if (dateRange) where.invoice_date = dateRange;

    const results = await prisma.invoices.groupBy({
      by: ["payment_method"],
      where,
      _sum: { total_amount: true },
      _count: { id: true },
    });

    res.json(results.map((r) => ({
      method: r.payment_method || "CASH",
      revenue: Number(r._sum.total_amount || 0),
      count: r._count.id,
    })));
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch payment breakdown" });
  }
};
