import crypto from "crypto"
import { prisma } from "@/lib/db"

export type WebhookEvent =
  | "response.completed"
  | "document.generated"
  | "signature.completed"
  | "signature.declined"

interface WebhookPayload {
  event: WebhookEvent
  data: Record<string, unknown>
  timestamp: string
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

export async function fireWebhooks(
  workspaceId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
  })

  const matchingEndpoints = endpoints.filter((ep) => {
    const events = ep.events as string[]
    return events.includes(event) || events.includes("*")
  })

  const payload: WebhookPayload = {
    event,
    data,
    timestamp: new Date().toISOString(),
  }

  const payloadStr = JSON.stringify(payload)

  await Promise.allSettled(
    matchingEndpoints.map(async (endpoint) => {
      const signature = signPayload(payloadStr, endpoint.secret)

      try {
        const response = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
          },
          body: payloadStr,
          signal: AbortSignal.timeout(10000),
        })

        await prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: { lastFiredAt: new Date() },
        })

        if (!response.ok) {
          console.error(`Webhook ${endpoint.url} returned ${response.status}`)
        }
      } catch (error) {
        console.error(`Webhook ${endpoint.url} failed:`, error)
      }
    })
  )
}
