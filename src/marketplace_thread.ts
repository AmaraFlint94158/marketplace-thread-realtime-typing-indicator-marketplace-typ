import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { InfraiRealtime } from "./infrai_realtime.ts";

const updateSchema = z.object({
  threadId: z.string().min(1),
  accountId: z.string().min(1),
  actor: z.enum(["seller", "buyer"]),
  kind: z.enum(["typing", "read", "asset", "order_handoff"]),
  value: z.string().min(1)
});
export type ThreadUpdate = z.infer<typeof updateSchema>;

export function chooseEvent(update: ThreadUpdate): string {
  if (update.kind === "typing") return "typing.indicator";
  if (update.kind === "read") return "receipt.read";
  if (update.kind === "asset") return "seller.asset";
  return "order.handoff";
}

export async function handleUpdate(update: ThreadUpdate, realtime: InfraiRealtime): Promise<{ event: string; threadId: string }> {
  const event = chooseEvent(update);
  await realtime.createChannel(update.threadId);
  await realtime.publish(update.threadId, event, {
    update_id: `${update.threadId}:${update.actor}:${update.kind}:${update.value}`,
    actor: update.actor,
    value: update.value
  }, update.accountId);
  return { event, threadId: update.threadId };
}

const key = process.env.INFRAI_API_KEY;
if (key && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const realtime = new InfraiRealtime(key);
  createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/thread-updates") {
      response.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const parsed = updateSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success) {
      response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "invalid request body" }));
      return;
    }
    try {
      const result = await handleUpdate(parsed.data, realtime);
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
    } catch (error) {
      const status = error instanceof Error && "status" in error ? Number((error as { status: number }).status) : 502;
      response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ error: error instanceof Error ? error.message : "request failed" }));
    }
  }).listen(Number(process.env.PORT ?? 3000));
}
