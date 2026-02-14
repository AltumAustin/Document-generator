"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Loader2, Copy, Check } from "lucide-react"
import { toast } from "sonner"

export function ApiKeyActions() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!name) return
    setLoading(true)
    try {
      const res = await fetch("/api/workspace/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, permissions: ["read", "write", "generate"] }),
      })
      if (!res.ok) throw new Error("Failed to create API key")
      const data = await res.json()
      setNewKey(data.key)
      toast.success("API key created")
    } catch {
      toast.error("Failed to create API key")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setName("")
    setNewKey(null)
    if (newKey) window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Create API Key</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{newKey ? "API Key Created" : "Create API Key"}</DialogTitle>
          <DialogDescription>
            {newKey
              ? "Copy this key now. You won't be able to see it again."
              : "Create a new API key for programmatic access."}
          </DialogDescription>
        </DialogHeader>
        {newKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted p-3 text-xs break-all">{newKey}</code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Production API Key" />
            </div>
          </div>
        )}
        <DialogFooter>
          {newKey ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={loading || !name}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Key
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
