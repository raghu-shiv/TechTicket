const TICKET_LIBRARY_PATH = "/tickets";

export function buildProductTicketLibraryUrl(productId: string): string {
  const normalizedProductId = productId.trim();

  if (!normalizedProductId) {
    return TICKET_LIBRARY_PATH;
  }

  const params = new URLSearchParams();
  params.set("productId", normalizedProductId);

  return `${TICKET_LIBRARY_PATH}?${params.toString()}`;
}

export function getProductIdFromTicketLibrarySearchParams(
  searchParams: URLSearchParams,
): string {
  return searchParams.get("productId")?.trim() ?? "";
}
