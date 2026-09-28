import { z } from "zod";

export const propertyRequest = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("maintenance"), propertyId: z.string().min(1), detail: z.string().min(1).max(2000) }),
  z.object({ kind: z.literal("tenant_document"), propertyId: z.string().min(1), detail: z.string().min(1).max(2000) }),
  z.object({ kind: z.literal("inspection_reminder"), propertyId: z.string().min(1), detail: z.string().min(1).max(2000) })
]);

export type PropertyRequest = z.infer<typeof propertyRequest>;

export function decideReply(request: PropertyRequest) {
  const instructions = {
    maintenance: "Draft a concise maintenance intake summary. Ask for access availability and avoid claiming a repair is scheduled.",
    tenant_document: "Draft a concise tenant document acknowledgement. Ask which document is needed and avoid claiming it was issued.",
    inspection_reminder: "Draft a concise inspection reminder. Ask the recipient to confirm the time and avoid claiming a visit is booked."
  } as const;

  return {
    queue: request.kind,
    messages: [
      { role: "system" as const, content: instructions[request.kind] },
      { role: "user" as const, content: `Property ${request.propertyId}: ${request.detail}` }
    ]
  };
}
