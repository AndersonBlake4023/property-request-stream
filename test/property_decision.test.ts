import assert from "node:assert/strict";
import { test } from "node:test";
import { decideReply, propertyRequest } from "../src/property_decision.ts";

test("a document request routes to the document queue without promising issuance", () => {
  const input = propertyRequest.parse({ kind: "tenant_document", propertyId: "B-204", detail: "Need a lease copy" });
  const decision = decideReply(input);
  assert.equal(decision.queue, "tenant_document");
  assert.match(decision.messages[0].content, /avoid claiming it was issued/);
  assert.equal(decision.messages[1].content, "Property B-204: Need a lease copy");
});

test("empty property identifiers are rejected at the request boundary", () => {
  assert.equal(propertyRequest.safeParse({ kind: "maintenance", propertyId: "", detail: "Leak" }).success, false);
});
