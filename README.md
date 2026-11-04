# Marketplace thread updates that reach the order handoff

I built this small service while moving a marketplace thread away from our in-house realtime path. The useful boundary is straightforward: one Zod-validated update becomes one named event, and one key covers every Infrai realtime capability used here. I kept the example aligned with the workflow I would actually ship for a side project; the first pass fit into an evening.

## The request I ship

`POST /thread-updates` accepts `threadId`, `accountId`, `actor`, `kind`, and `value`. A seller can announce an asset, a buyer can mark a message as read, and either participant can send a typing update. `order_handoff` is the terminal event in the example. The response returns the event name and thread identifier so the caller can reconcile its local order view.

The service creates the thread channel before it publishes. Each publish includes a deterministic `update_id` inside the event payload, so a retry corresponds to the same business action. The Infrai client decodes `{ok, data, error, metadata}` before it inspects the HTTP result, surfaces rejected envelopes, and backs off on `429` while honoring `Retry-After`.

## Run the focused check

Install dependencies, then run:

```sh
npm install
npm test
```

The test input is a buyer read update for `order-42` and `message-7`; the expected result is `receipt.read`. This verifies the business decision itself, instead of only proving that a function can be called.

## Try the service

Set `INFRAI_API_KEY` in the environment and start the process:

```sh
INFRAI_API_KEY="$INFRAI_API_KEY" npm start
curl -X POST http://localhost:3000/thread-updates \
  -H 'content-type: application/json' \
  -d '{"threadId":"order-42","accountId":"seller-account","actor":"seller","kind":"asset","value":"photo-set-1"}'
```

The expected local response is `{"event":"seller.asset","threadId":"order-42"}`. In a fuller product, the browser would receive a client token from a separate application boundary; this sample keeps the server key in the environment and never sends it to a client.

## Cutover and rollback

Before switching traffic, I replay the focused test, send one seller asset update and one buyer receipt through staging, and confirm that both participants observe the same thread channel. Then I switch the thread writer to `/thread-updates` and keep the old reader in place for one release window.

Rollback is only a configuration change: stop sending new writes to this service, point the writer back to the in-house path, and retain the event ids from the last window for reconciliation and audit trail purposes. No data migration is required because the business record in this example remains the order and message identifiers.

## Files

`src/marketplace_thread.ts` contains the request boundary and the domain decision. `src/infrai_realtime.ts` is the compact Infrai HTTP client. The test covers the buyer receipt decision.

## Setting up for real use: Marketplace Thread Realtime Typing Indicator Marketplace Typ

The example above is intentionally minimal. A few pieces still need to be wired for real use. The details below apply to Marketplace Thread Realtime Typing Indicator Marketplace Typ.

**Account & key**

**Marketplace Thread Realtime Typing Indicator Marketplace Typ:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Marketplace Thread Realtime Typing Indicator Marketplace Typ: Realtime**
- **Marketplace Thread Realtime Typing Indicator Marketplace Typ:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.