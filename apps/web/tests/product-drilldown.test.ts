import { describe, expect, it } from "vitest";

import {
  buildProductTicketLibraryUrl,
  getProductIdFromTicketLibrarySearchParams,
} from "@/lib/product-drilldown";

describe("product drill-down", () => {
  describe("buildProductTicketLibraryUrl", () => {
    it("builds the ticket library URL with productId", () => {
      expect(buildProductTicketLibraryUrl("product-123")).toBe(
        "/tickets?productId=product-123",
      );
    });

    it("URL-encodes product IDs", () => {
      expect(buildProductTicketLibraryUrl("product 123")).toBe(
        "/tickets?productId=product+123",
      );
    });

    it("trims whitespace from the product ID", () => {
      expect(buildProductTicketLibraryUrl("  product-123  ")).toBe(
        "/tickets?productId=product-123",
      );
    });

    it("returns the normal ticket library when no product ID is provided", () => {
      expect(buildProductTicketLibraryUrl("")).toBe("/tickets");
    });

    it("returns the normal ticket library for whitespace-only input", () => {
      expect(buildProductTicketLibraryUrl("   ")).toBe("/tickets");
    });
  });

  describe("getProductIdFromTicketLibrarySearchParams", () => {
    it("reads productId from the query string", () => {
      const params = new URLSearchParams("productId=product-123");

      expect(getProductIdFromTicketLibrarySearchParams(params)).toBe(
        "product-123",
      );
    });

    it("trims the product ID", () => {
      const params = new URLSearchParams("productId=%20product-123%20");

      expect(getProductIdFromTicketLibrarySearchParams(params)).toBe(
        "product-123",
      );
    });

    it("returns an empty string when productId is absent", () => {
      const params = new URLSearchParams("status=OPEN");

      expect(getProductIdFromTicketLibrarySearchParams(params)).toBe("");
    });

    it("returns an empty string when productId is empty", () => {
      const params = new URLSearchParams("productId=");

      expect(getProductIdFromTicketLibrarySearchParams(params)).toBe("");
    });
  });
});
