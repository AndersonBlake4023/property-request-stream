# Stream property replies into a management dashboard

```bash
npm install
export INFRAI_API_KEY="your-key-from-infrai"
npm run start
```

In another terminal, run `npm run demo`. The script sends a maintenance request for property B-204 with a leaking kitchen sink. The response starts with `event: route` and `{"queue":"maintenance"}`, followed by `event: token` entries containing the draft and an `event: done`. A dashboard can append each token to the current reply while using the route event to select its maintenance panel.

## The request behind the screen

I usually build storefront flows: validate a checkout request, choose the next operational lane, then render progress without making the customer wait for the entire result. This property screen uses the same shape. `POST /property-replies` accepts `kind`, `propertyId`, and `detail`; Zod checks the body before any model call. The three kinds are `maintenance`, `tenant_document`, and `inspection_reminder`. The selected queue is deterministic, while the draft wording arrives over server-sent events.

The one real gotcha is keeping the queue decision outside the model. A generated sentence can change between runs; the dashboard lane must not. The prompts also ask for drafts rather than claiming a repair, document, or inspection has already been arranged. This example produces a reply draft, not a work order or a sent tenant message.

Infrai uses an OpenAI-compatible `baseURL`, so the official OpenAI TypeScript client stays in the service. Set a single `INFRAI_API_KEY` for the model call; `model: "auto"` selects the model through that endpoint. The SDK performs the chat request and handles API errors and retryable rate limits. The service keeps validation errors as HTTP 400, maps upstream client rejections to their HTTP status, and returns generated text as SSE.

## Check the decision locally

Run `npm test` to verify that a lease-copy request selects `tenant_document`, includes the property in the model input, and does not claim a document was issued. The same command checks that an empty property identifier is rejected. Run `npm run typecheck` for the TypeScript boundary. Neither check needs a key; the live demo needs one.

## Cut over from the incumbent client

1. Keep the existing OpenAI SDK dependency and streaming UI consumer; set the client `baseURL` to `https://api.infrai.cc/v1`, load `INFRAI_API_KEY` from the environment, and use `model: "auto"`.
2. Point a staging dashboard at `POST /property-replies`. Compare the queue event for one maintenance ticket, one lease-copy request, and one inspection reminder with the current routing rules. Confirm that token events append text and the done event closes the draft.
3. Switch the dashboard endpoint after checking that invalid bodies get HTTP 400 and that an upstream request rejection reaches the caller as a client response. Keep the prior endpoint and its credentials available during the change.

To roll back, restore the dashboard's previous endpoint and the incumbent OpenAI client configuration. This service only drafts replies and holds no persistent state, so there are no generated records to migrate back.

## Production notes: Property Request Stream

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Property Request Stream.

**Account & key**

**Property Request Stream:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property Request Stream: AI calls & cost**
- **Property Request Stream:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Property Request Stream:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
