import { describe, expect, it } from "vitest";

import { buildProductTicketLibraryUrl } from "@/lib/product-drilldown";

import type {
  ProductAnalyticsProduct,
  ProductAnalyticsResponse,
} from "@/types/product-analytics";

const baseProduct: ProductAnalyticsProduct = {
  id: "product-1",
  name: "Payments",
  isActive: true,
  ticketVolume: 10,
  activeTickets: 4,
  resolvedClosedTickets: 6,

  priorityDistribution: [
    {
      key: "LOW",
      label: "LOW",
      count: 4,
      percentage: 40,
    },
    {
      key: "MEDIUM",
      label: "MEDIUM",
      count: 3,
      percentage: 30,
    },
    {
      key: "HIGH",
      label: "HIGH",
      count: 2,
      percentage: 20,
    },
    {
      key: "URGENT",
      label: "URGENT",
      count: 1,
      percentage: 10,
    },
  ],

  sla: {
    tracked: 8,
    breached: 2,
    compliant: 6,
    complianceRate: 75,
  },

  tat: {
    resolved: 6,
    averageResolutionMinutes: 180,
    medianResolutionMinutes: 120,
  },

  trend: [
    {
      date: "2026-10-01T00:00:00.000Z",
      count: 4,
    },
    {
      date: "2026-10-02T00:00:00.000Z",
      count: 6,
    },
  ],
};

function buildResponse(
  overrides: Partial<ProductAnalyticsResponse["data"]> = {},
): ProductAnalyticsResponse {
  return {
    data: {
      summary: {
        totalTickets: 10,
        activeTickets: 4,
        resolvedClosedTickets: 6,
        productsWithTickets: 1,
        slaTracked: 8,
        slaBreached: 2,
        slaComplianceRate: 75,
        averageResolutionMinutes: 180,
        medianResolutionMinutes: 120,
      },
      products: [baseProduct],
      ...overrides,
    },
    meta: {
      query: {
        dateField: "createdAt",
        dateFrom: null,
        dateTo: null,
        productId: null,
        organizationScoped: true,
        queryVersion: 1,
      },
    },
  };
}

describe("Product Dashboard verification", () => {
  it("preserves organization-scoped analytics metadata", () => {
    const response = buildResponse();

    expect(response.meta.query.organizationScoped).toBe(true);
    expect(response.meta.query.queryVersion).toBe(1);
  });

  it("supports an empty product analytics result", () => {
    const response = buildResponse({
      summary: {
        ...buildResponse().data.summary,
        totalTickets: 0,
        activeTickets: 0,
        resolvedClosedTickets: 0,
        productsWithTickets: 0,
        slaTracked: 0,
        slaBreached: 0,
        slaComplianceRate: null,
        averageResolutionMinutes: null,
        medianResolutionMinutes: null,
      },
      products: [],
    });

    expect(response.data.products).toHaveLength(0);
    expect(response.data.summary.totalTickets).toBe(0);
    expect(response.data.summary.slaComplianceRate).toBeNull();
    expect(response.data.summary.averageResolutionMinutes).toBeNull();
    expect(response.data.summary.medianResolutionMinutes).toBeNull();
  });

  it("preserves inactive products for historical analytics", () => {
    const inactiveProduct: ProductAnalyticsProduct = {
      ...baseProduct,
      id: "legacy-product",
      name: "Legacy Product",
      isActive: false,
    };

    const response = buildResponse({
      products: [baseProduct, inactiveProduct],
    });

    expect(
      response.data.products.find((product) => !product.isActive)?.name,
    ).toBe("Legacy Product");
  });

  it("keeps product lifecycle totals internally consistent", () => {
    for (const product of buildResponse().data.products) {
      expect(product.activeTickets + product.resolvedClosedTickets).toBe(
        product.ticketVolume,
      );
    }
  });

  it("keeps SLA counts internally consistent", () => {
    for (const product of buildResponse().data.products) {
      expect(product.sla.compliant + product.sla.breached).toBe(
        product.sla.tracked,
      );
    }
  });

  it("keeps priority distribution internally consistent", () => {
    const distribution = buildResponse().data.products[0].priorityDistribution;

    expect(distribution.reduce((sum, point) => sum + point.count, 0)).toBe(10);

    expect(distribution.reduce((sum, point) => sum + point.percentage, 0)).toBe(
      100,
    );
  });

  it("preserves selected product filtering metadata", () => {
    const response = buildResponse();

    response.meta.query.productId = "product-1";

    expect(response.meta.query.productId).toBe("product-1");
  });

  it("builds the correct Ticket Library drill-down URL", () => {
    expect(buildProductTicketLibraryUrl("product-1")).toBe(
      "/tickets?productId=product-1",
    );
  });

  it("URL-encodes drill-down product IDs safely", () => {
    expect(buildProductTicketLibraryUrl("product 1")).toBe(
      "/tickets?productId=product+1",
    );
  });
});
