"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

const EVENTS = [
  { id: "response.completed", label: "Response Completed" },
  { id: "document.generated", label: "Document Generated" },
  { id: "signature.completed", label: "Signature Completed" },
  { id: "signature.declined", label: "Signature Declined" },
]

export function WebhookActions() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    )
  }

  const handleCreate = async () => {
    if (!url || selectedEvents.length === 0) return
    setLoading(true)
    try {
      const res = await fetch("/api/workspace/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events: selectedEvents }),
      })
      if (!res.ok) throw new Error("Failed to create webhook")
      toast.success("Webhook created")
      setOpen(false)
      setUrl("")
      setSelectedEvents([])
      window.location.reload()
    } catch {
      toast.error("Failed to create webhook")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Add Webhook</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>Configure a URL to receive event notifications.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input id="webhook-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-server.com/webhook" />
          </div>
          <div className="space-y-2">
            <Label>Events</Label>
            <div className="space-y-2">
              {EVENTS.map((event) => (
                <div key={event.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={event.id}
                    checked={selectedEvents.includes(event.id)}
                    onCheckedChange={() => toggleEvent(event.id)}
                  />
                  <label htmlFor={event.id} className="text-sm">{event.label}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !url || selectedEvents.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Webhook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
