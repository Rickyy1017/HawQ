import { createFileRoute } from "@tanstack/react-router";
import { DemoNotice } from "../components/DemoNotice";
import { PositionsTable } from "../components/PositionsTable";
import { usePositions } from "../hooks/usePositions";

export const Route = createFileRoute("/my-positions")({
  head: () => ({
    meta: [
      { title: "My Positions — HawQ" },
      {
        name: "description",
        content:
          "All logged demo spot, perps and prediction positions on HawQ.",
      },
      { property: "og:title", content: "My Positions — HawQ" },
      {
        property: "og:description",
        content:
          "All logged demo spot, perps and prediction positions on HawQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyPositionsPage,
});
function MyPositionsPage() {
  const { positions, isLoading, error } = usePositions();
  return (
    <main className="space-y-6 py-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">My Positions</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All logged spot, perps and prediction demo positions
        </p>
      </div>
      <DemoNotice />
      <PositionsTable
        positions={positions}
        title="All positions"
        isLoading={isLoading}
        error={error}
      />
    </main>
  );
}
