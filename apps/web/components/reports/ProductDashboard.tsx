"use client";

import Link from "next/link";
import { buildProductTicketLibraryUrl } from "@/lib/product-drilldown";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Inbox,
  Package,
  TicketCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
} from "@/components/shared";

import { useOrganizations } from "@/hooks/use-organizations";
import { useProductAnalytics } from "@/hooks/use-product-analytics";
import type { ProductAnalyticsProduct } from "@/types/product-analytics";

function formatRate(rate: number | null) {
  return rate === null ? "—" : `${rate.toFixed(1)}%`;
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) {
    return "—";
  }

  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  const hours = minutes / 60;

  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }

  return `${(hours / 24).toFixed(1)}d`;
}

function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatPriority(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function ProductDashboard() {
  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const defaultDates = useMemo(() => {
    const to = new Date();
    const from = new Date(to);

    from.setDate(from.getDate() - 29);

    return {
      from: getDateString(from),
      to: getDateString(to),
    };
  }, []);

  const [from, setFrom] = useState(defaultDates.from);
  const [to, setTo] = useState(defaultDates.to);
  const [productId, setProductId] = useState("");

  const productQuery = useProductAnalytics(organizationId, {
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
    productId: productId || undefined,
  });

  if (organizationsQuery.isLoading) {
    return <LoadingState label="Loading workspace..." />;
  }

  if (organizationsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load workspace"
        description="We couldn't determine your current organization."
        onRetry={() => organizationsQuery.refetch()}
      />
    );
  }

  if (!organizationId) {
    return (
      <EmptyState
        icon={Inbox}
        title="No organization available"
        description="Your account is not associated with an organization."
      />
    );
  }

  if (productQuery.isLoading) {
    return <LoadingState label="Loading product analytics..." />;
  }

  if (productQuery.isError) {
    return (
      <ErrorState
        title="Unable to load product analytics"
        description={
          productQuery.error instanceof Error
            ? productQuery.error.message
            : "We couldn't load product analytics."
        }
        onRetry={() => productQuery.refetch()}
      />
    );
  }

  const result = productQuery.data;

  if (!result) {
    return <LoadingState />;
  }

  const summary = result.data.summary;
  const products = result.data.products;

  const selectedProduct =
    products.find((product) => product.id === productId) ?? null;

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* HEADER + FILTERS                                                 */}
      {/* ---------------------------------------------------------------- */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Product Analytics
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Analyze ticket volume, SLA performance, priority mix, and resolution
            performance by product.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div>
            <label
              htmlFor="product-analytics-from"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              From
            </label>

            <Input
              id="product-analytics-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="product-analytics-to"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              To
            </label>

            <Input
              id="product-analytics-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>

          <div className="min-w-[200px]">
            <label
              htmlFor="product-analytics-product"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Product
            </label>

            <select
              id="product-analytics-product"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
            >
              <option value="">All products</option>

              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {!product.isActive ? " (Inactive)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* SUMMARY                                                           */}
      {/* ---------------------------------------------------------------- */}

      <section
        aria-label="Product analytics overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="Total Tickets"
          value={summary.totalTickets}
          description="Tickets in selected period"
          icon={BarChart3}
        />

        <StatCard
          title="Active Tickets"
          value={summary.activeTickets}
          description="Open, in progress, or pending"
          icon={Clock3}
        />

        <StatCard
          title="Resolved / Closed"
          value={summary.resolvedClosedTickets}
          description="Completed ticket lifecycle"
          icon={TicketCheck}
        />

        <StatCard
          title="Products With Tickets"
          value={summary.productsWithTickets}
          description="Products represented in ticket data"
          icon={Package}
        />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* SLA + TAT                                                         */}
      {/* ---------------------------------------------------------------- */}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SLA Performance</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <Metric
                label="Compliance"
                value={formatRate(summary.slaComplianceRate)}
              />

              <Metric label="Tracked" value={String(summary.slaTracked)} />

              <Metric label="Breached" value={String(summary.slaBreached)} />
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(
                    Math.max(summary.slaComplianceRate ?? 0, 0),
                    100,
                  )}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolution / TAT</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <Metric
                label="Resolved"
                value={String(summary.resolvedClosedTickets)}
              />

              <Metric
                label="Average TAT"
                value={formatMinutes(summary.averageResolutionMinutes)}
              />

              <Metric
                label="Median TAT"
                value={formatMinutes(summary.medianResolutionMinutes)}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* PRODUCT COMPARISON                                                */}
      {/* ---------------------------------------------------------------- */}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Product Performance</CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                Compare ticket volume, workload, SLA compliance, and TAT.
              </p>
            </div>

            {productId && (
              <button
                type="button"
                onClick={() => setProductId("")}
                className="text-sm font-medium text-primary hover:underline"
              >
                Show all products
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Package}
                title="No products found"
                description="There are no products available for this organization."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-y bg-muted/30 text-left">
                    <th className="px-5 py-3 font-medium text-muted-foreground">
                      Product
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Tickets
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Active
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Resolved
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      SLA
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Avg TAT
                    </th>

                    <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                      Tickets
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setProductId(product.id)}
                          className="text-left font-medium hover:text-primary hover:underline"
                        >
                          {product.name}
                        </button>

                        <p
                          className={
                            product.isActive
                              ? "mt-1 text-xs text-emerald-600"
                              : "mt-1 text-xs text-muted-foreground"
                          }
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right font-medium">
                        {product.ticketVolume}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {product.activeTickets}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {product.resolvedClosedTickets}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {formatRate(product.sla.complianceRate)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {formatMinutes(product.tat.averageResolutionMinutes)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={buildProductTicketLibraryUrl(product.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          View tickets
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* SELECTED PRODUCT                                                  */}
      {/* ---------------------------------------------------------------- */}

      {selectedProduct ? (
        <SelectedProduct product={selectedProduct} />
      ) : (
        <ProductVolumeOverview products={products} onSelect={setProductId} />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function SelectedProduct({ product }: { product: ProductAnalyticsProduct }) {
  return (
    <div className="space-y-6">
      {/* Product detail header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>{product.name}</CardTitle>

                <span
                  className={
                    product.isActive
                      ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {product.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                Detailed product performance for the selected period.
              </p>
            </div>

            <Link
              href={buildProductTicketLibraryUrl(product.id)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Open Ticket Library
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailMetric
              label="Ticket volume"
              value={String(product.ticketVolume)}
              icon={BarChart3}
            />

            <DetailMetric
              label="Active tickets"
              value={String(product.activeTickets)}
              icon={Clock3}
            />

            <DetailMetric
              label="SLA compliance"
              value={formatRate(product.sla.complianceRate)}
              icon={CheckCircle2}
            />

            <DetailMetric
              label="SLA breaches"
              value={String(product.sla.breached)}
              icon={AlertTriangle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Priority + TAT */}
      <section className="grid gap-6 lg:grid-cols-2">
        <PriorityDistribution points={product.priorityDistribution} />

        <ProductResolutionPerformance product={product} />
      </section>

      {/* Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket Trend</CardTitle>
        </CardHeader>

        <CardContent>
          {product.trend.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No ticket activity"
              description="There is no ticket activity for this product in the selected period."
            />
          ) : (
            <ProductTrendChart points={product.trend} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />

        <span className="text-sm text-muted-foreground">{label}</span>
      </div>

      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function PriorityDistribution({
  points,
}: {
  points: ProductAnalyticsProduct["priorityDistribution"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Priority Distribution</CardTitle>
      </CardHeader>

      <CardContent>
        {points.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No priority data"
            description="This product has no tickets in the selected period."
          />
        ) : (
          <div className="space-y-4">
            {points.map((point) => (
              <div key={point.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{formatPriority(point.label)}</span>

                  <span className="text-muted-foreground">
                    {point.count} · {point.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.min(Math.max(point.percentage, 0), 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProductResolutionPerformance({
  product,
}: {
  product: ProductAnalyticsProduct;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolution Performance</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          <Metric label="Resolved" value={String(product.tat.resolved)} />

          <Metric
            label="Average TAT"
            value={formatMinutes(product.tat.averageResolutionMinutes)}
          />

          <Metric
            label="Median TAT"
            value={formatMinutes(product.tat.medianResolutionMinutes)}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">SLA tracked</p>

            <p className="mt-1 text-2xl font-semibold">{product.sla.tracked}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">SLA compliant</p>

            <p className="mt-1 text-2xl font-semibold">
              {product.sla.compliant}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductVolumeOverview({
  products,
  onSelect,
}: {
  products: ProductAnalyticsProduct[];
  onSelect: (productId: string) => void;
}) {
  const points = products
    .filter((product) => product.ticketVolume > 0)
    .slice(0, 8);

  const maximum = Math.max(...points.map((product) => product.ticketVolume), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Volume</CardTitle>

        <p className="text-sm text-muted-foreground">
          Select a product for detailed trend and performance analysis.
        </p>
      </CardHeader>

      <CardContent>
        {points.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No product activity"
            description="There are no product tickets in the selected period."
          />
        ) : (
          <div className="space-y-5">
            {points.map((product) => (
              <div key={product.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => onSelect(product.id)}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {product.name}
                  </button>

                  <span className="text-muted-foreground">
                    {product.ticketVolume}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${(product.ticketVolume / maximum) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProductTrendChart({
  points,
}: {
  points: Array<{
    date: string;
    count: number;
  }>;
}) {
  const width = 900;
  const height = 280;

  const padding = {
    top: 24,
    right: 24,
    bottom: 48,
    left: 48,
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maximum = Math.max(...points.map((point) => point.count), 1);

  const getX = (index: number) => {
    if (points.length === 1) {
      return padding.left + chartWidth / 2;
    }

    return padding.left + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (count: number) =>
    padding.top + chartHeight - (count / maximum) * chartHeight;

  const path = points
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.count);

      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-w-[600px] w-full"
        role="img"
        aria-label="Product ticket volume trend"
      >
        {Array.from({ length: 5 }).map((_, index) => {
          const y = padding.top + (index / 4) * chartHeight;

          const value = maximum - (index / 4) * maximum;

          return (
            <g key={index}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                className="stroke-border"
              />

              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          className="stroke-border"
        />

        <path
          d={path}
          fill="none"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => {
          const x = getX(index);
          const y = getY(point.count);

          return (
            <g key={`${point.date}-${index}`}>
              <circle cx={x} cy={y} r="4" className="fill-primary" />

              <title>
                {formatDate(point.date)}: {point.count}{" "}
                {point.count === 1 ? "ticket" : "tickets"}
              </title>

              {(index === 0 ||
                index === points.length - 1 ||
                points.length <= 7 ||
                index % Math.ceil(points.length / 6) === 0) && (
                <text
                  x={x}
                  y={height - 16}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {formatDate(point.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
