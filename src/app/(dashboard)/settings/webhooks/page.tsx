import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Webhook,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Globe,
  Clock,
  Zap,
  CheckCircle2,
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"

const AVAILABLE_EVENTS = [
  { id: "response.created", label: "Response Created", description: "When a new response is submitted" },
  { id: "response.completed", label: "Response Completed", description: "When a response is marked as complete" },
  { id: "document.generated", label: "Document Generated", description: "When a document is generated from a response" },
  { id: "template.updated", label: "Template Updated", description: "When a template is updated or new version uploaded" },
  { id: "questionnaire.created", label: "Questionnaire Created", description: "When a new questionnaire is created" },
  { id: "signature.completed", label: "Signature Completed", description: "When a document signature is completed" },
]

export default async function WebhooksPage() {
  const user = await getCurrentUser()
  if (!user?.workspaceId) redirect("/login")

  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
  })

  const activeCount = webhooks.filter((w) => w.isActive).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhook endpoints to receive real-time event notifications
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Webhook Endpoint</DialogTitle>
              <DialogDescription>
                Configure a URL to receive POST requests when events occur in your workspace.
              </DialogDescription>
            </DialogHeader>
            <form action="/api/workspace/webhooks" method="POST">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input
                    id="url"
                    name="url"
                    type="url"
                    placeholder="https://your-app.com/webhooks/docgen"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be a publicly accessible HTTPS URL.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Events to Subscribe</Label>
                  <div className="space-y-3 rounded-md border p-4">
                    {AVAILABLE_EVENTS.map((event) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <Checkbox
                          id={`event-${event.id}`}
                          name="events"
                          value={event.id}
                          className="mt-0.5"
                        />
                        <div>
                          <Label
                            htmlFor={`event-${event.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {event.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  <Webhook className="mr-2 h-4 w-4" />
                  Create Webhook
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhooks list */}
      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No webhooks configured</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Set up webhook endpoints to receive real-time notifications when events
              occur in your workspace, such as new responses or generated documents.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Webhook Endpoint</DialogTitle>
                  <DialogDescription>
                    Configure a URL to receive POST requests when events occur.
                  </DialogDescription>
                </DialogHeader>
                <form action="/api/workspace/webhooks" method="POST">
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="url-empty">Endpoint URL</Label>
                      <Input
                        id="url-empty"
                        name="url"
                        type="url"
                        placeholder="https://your-app.com/webhooks/docgen"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Events</Label>
                      <div className="space-y-2 rounded-md border p-4">
                        {AVAILABLE_EVENTS.map((event) => (
                          <div key={event.id} className="flex items-center gap-3">
                            <Checkbox
                              id={`event-empty-${event.id}`}
                              name="events"
                              value={event.id}
                            />
                            <Label
                              htmlFor={`event-empty-${event.id}`}
                              className="text-sm cursor-pointer"
                            >
                              {event.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Create Webhook</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => {
            const events = (webhook.events as string[]) || []

            return (
              <Card key={webhook.id}>
                <CardContent className="p-0">
                  <div className="flex items-center justify-between p-6">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div
                        className={`mt-1 rounded-full p-2 ${
                          webhook.isActive
                            ? "bg-green-100 text-green-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Globe className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono truncate max-w-[400px]">
                            {webhook.url}
                          </code>
                          <Badge variant={webhook.isActive ? "default" : "secondary"}>
                            {webhook.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {events.length} event{events.length !== 1 ? "s" : ""}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {webhook.lastFiredAt
                              ? `Last fired ${formatDateTime(webhook.lastFiredAt)}`
                              : "Never fired"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {webhook.isActive ? "Enabled" : "Disabled"}
                        </span>
                        <Switch
                          checked={webhook.isActive}
                          aria-label={`Toggle webhook ${webhook.url}`}
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Endpoint
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Zap className="mr-2 h-4 w-4" />
                            Send Test Event
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Webhook
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Webhook info card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Available Events
          </CardTitle>
          <CardDescription>
            Events you can subscribe to with your webhook endpoints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {AVAILABLE_EVENTS.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-md border p-3"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{event.description}</p>
                  <code className="text-xs text-muted-foreground mt-1 block">
                    {event.id}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
