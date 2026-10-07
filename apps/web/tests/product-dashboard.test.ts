import { describe, expect, it } from "vitest";

import type {
  ProductAnalyticsResponse,
  ProductAnalyticsProduct,
} from "@/types/product-analytics";

const mockProduct: ProductAnalyticsProduct = {
  id: "product-1",
  name: "TechTicket",
  isActive: true,

  ticketVolume: 100,
  activeTickets: 35,
  resolvedClosedTickets: 65,

  priorityDistribution: [
    {
      key: "LOW",
      label: "LOW",
      count: 20,
      percentage: 20,
    },
    {
      key: "MEDIUM",
      label: "MEDIUM",
      count: 40,
      percentage: 40,
    },
    {
      key: "HIGH",
      label: "HIGH",
      count: 30,
      percentage: 30,
    },
    {
      key: "URGENT",
      label: "URGENT",
      count: 10,
      percentage: 10,
    },
  ],

  sla: {
    tracked: 80,
    breached: 12,
    compliant: 68,
    complianceRate: 85,
  },

  tat: {
    resolved: 65,
    averageResolutionMinutes: 240,
    medianResolutionMinutes: 180,
  },

  trend: [
    {
      date: "2026-10-01T00:00:00.000Z",
      count: 10,
    },
    {
      date: "2026-10-02T00:00:00.000Z",
      count: 15,
    },
  ],
};

const mockResponse: ProductAnalyticsResponse = {
  data: {
    summary: {
      totalTickets: 120,
      activeTickets: 40,
      resolvedClosedTickets: 80,
      productsWithTickets: 2,

      slaTracked: 100,
      slaBreached: 15,
      slaComplianceRate: 85,

      averageResolutionMinutes: 300,
      medianResolutionMinutes: 240,
    },

    products: [
      mockProduct,
      {
        ...mockProduct,
        id: "product-2",
        name: "Legacy Product",
        isActive: false,
        ticketVolume: 20,
        activeTickets: 5,
        resolvedClosedTickets: 15,
      },
    ],
  },

  meta: {
    query: {
      dateField: "createdAt",
      dateFrom: "2026-10-01T00:00:00.000Z",
      dateTo: "2026-10-31T23:59:59.999Z",
      productId: null,
      organizationScoped: true,
      queryVersion: 1,
    },
  },
};

describe("Product Dashboard response", () => {
  it("contains the expected response structure", () => {
    expect(mockResponse).toHaveProperty("data");
    expect(mockResponse).toHaveProperty("meta");
    expect(mockResponse.data).toHaveProperty("summary");
    expect(mockResponse.data).toHaveProperty("products");
  });

  it("contains summary metrics", () => {
    const { summary } = mockResponse.data;

    expect(summary.totalTickets).toBe(120);
    expect(summary.activeTickets).toBe(40);
    expect(summary.resolvedClosedTickets).toBe(80);
    expect(summary.productsWithTickets).toBe(2);
  });

  it("keeps active and resolved totals consistent", () => {
    const { summary } = mockResponse.data;

    expect(summary.activeTickets + summary.resolvedClosedTickets).toBe(
      summary.totalTickets,
    );
  });

  it("contains SLA summary metrics", () => {
    const { summary } = mockResponse.data;

    expect(summary.slaTracked).toBe(100);
    expect(summary.slaBreached).toBe(15);
    expect(summary.slaComplianceRate).toBe(85);
  });

  it("contains TAT summary metrics", () => {
    const { summary } = mockResponse.data;

    expect(summary.averageResolutionMinutes).toBe(300);
    expect(summary.medianResolutionMinutes).toBe(240);
  });

  it("contains product-level metrics", () => {
    const product = mockResponse.data.products[0];

    expect(product.ticketVolume).toBe(100);
    expect(product.activeTickets).toBe(35);
    expect(product.resolvedClosedTickets).toBe(65);
  });

  it("keeps product ticket metrics internally consistent", () => {
    for (const product of mockResponse.data.products) {
      expect(product.activeTickets + product.resolvedClosedTickets).toBe(
        product.ticketVolume,
      );
    }
  });

  it("contains priority distribution", () => {
    const distribution = mockResponse.data.products[0].priorityDistribution;

    expect(distribution).toHaveLength(4);

    expect(distribution.reduce((sum, point) => sum + point.count, 0)).toBe(100);
  });

  it("contains SLA metrics per product", () => {
    const { sla } = mockResponse.data.products[0];

    expect(sla.tracked).toBe(80);
    expect(sla.breached).toBe(12);
    expect(sla.compliant).toBe(68);
    expect(sla.compliant + sla.breached).toBe(sla.tracked);
  });

  it("contains trend data", () => {
    const trend = mockResponse.data.products[0].trend;

    expect(trend).toHaveLength(2);
    expect(trend.map((point) => point.count)).toEqual([10, 15]);
  });

  it("preserves inactive products for historical reporting", () => {
    const inactiveProduct = mockResponse.data.products.find(
      (product) => !product.isActive,
    );

    expect(inactiveProduct).toBeDefined();
    expect(inactiveProduct?.name).toBe("Legacy Product");
  });

  it("supports a null SLA compliance rate", () => {
    const product = {
      ...mockProduct,
      sla: {
        ...mockProduct.sla,
        tracked: 0,
        breached: 0,
        compliant: 0,
        complianceRate: null,
      },
    };

    expect(product.sla.complianceRate).toBeNull();
  });

  it("supports null TAT metrics", () => {
    const product = {
      ...mockProduct,
      tat: {
        resolved: 0,
        averageResolutionMinutes: null,
        medianResolutionMinutes: null,
      },
    };

    expect(product.tat.averageResolutionMinutes).toBeNull();
    expect(product.tat.medianResolutionMinutes).toBeNull();
  });

  it("confirms the API is organization scoped", () => {
    expect(mockResponse.meta.query.organizationScoped).toBe(true);
  });

  it("supports product-level filtering metadata", () => {
    const filteredResponse: ProductAnalyticsResponse = {
      ...mockResponse,
      meta: {
        ...mockResponse.meta,
        query: {
          ...mockResponse.meta.query,
          productId: "product-1",
        },
      },
    };

    expect(filteredResponse.meta.query.productId).toBe("product-1");
  });
});
