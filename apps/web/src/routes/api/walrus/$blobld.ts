import { createFileRoute } from "@tanstack/react-router";
import { WALRUS_AGGREGATOR } from "../../../lib/walrus/config";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/walrus/$blobld")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        const blobId = params.blobId;

        // Mock blobs (created when the publisher was unreachable) cannot be
        // fetched from the aggregator — surface a clear, honest response.
        if (blobId.startsWith("mock-")) {
          return new Response(
            JSON.stringify({
              error: "unavailable",
              message:
                "This artifact was created in offline/demo mode and is not retrievable from the Walrus aggregator.",
              blobId,
            }),
            {
              status: 404,
              headers: { "Content-Type": "application/json", ...CORS },
            },
          );
        }

        try {
          const res = await fetch(
            `${WALRUS_AGGREGATOR}/v1/blobs/${encodeURIComponent(blobId)}`,
          );
          if (!res.ok) {
            return new Response(
              JSON.stringify({ error: "not_found", blobId }),
              {
                status: res.status,
                headers: { "Content-Type": "application/json", ...CORS },
              },
            );
          }
          const text = await res.text();
          return new Response(text, {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=31536000, immutable",
              ...CORS,
            },
          });
        } catch {
          return new Response(
            JSON.stringify({ error: "fetch_failed", blobId }),
            {
              status: 502,
              headers: { "Content-Type": "application/json", ...CORS },
            },
          );
        }
      },
    },
  },
});
