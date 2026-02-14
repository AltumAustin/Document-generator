import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Key,
  Plus,
  Trash2,
  Copy,
  AlertTriangle,
  Clock,
  Shield,
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"

export default async function ApiKeysPage() {
  const user = await getCurrentUser()
  if (!user?.workspaceId) redirect("/login")

  const apiKeys = await prisma.apiKey.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
  })

  const activeCount = apiKeys.filter((k) => k.isActive).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for programmatic access to your workspace
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for authenticating requests to the REST API.
              </DialogDescription>
            </DialogHeader>
            <form action="/api/workspace/api-keys" method="POST">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g. Production API Key"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    A descriptive name to help you identify this key.
                  </p>
                </div>
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Important</p>
                      <p className="mt-1">
                        The API key will only be shown once after creation. Make sure to
                        copy and store it securely.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  <Key className="mr-2 h-4 w-4" />
                  Generate Key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys ({activeCount} active)
          </CardTitle>
          <CardDescription>
            Use API keys to authenticate requests. Include the key in the Authorization
            header as: <code className="bg-muted px-1 rounded text-xs">Bearer YOUR_API_KEY</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No API keys</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
                Create an API key to start making authenticated requests to the
                document generation API.
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New API Key</DialogTitle>
                    <DialogDescription>
                      Generate a new API key for authenticating requests.
                    </DialogDescription>
                  </DialogHeader>
                  <form action="/api/workspace/api-keys" method="POST">
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name-empty">Key Name</Label>
                        <Input
                          id="name-empty"
                          name="name"
                          placeholder="e.g. Production API Key"
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">
                        <Key className="mr-2 h-4 w-4" />
                        Generate Key
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{apiKey.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                          {"*".repeat(24)}{apiKey.key.slice(-8)}
                        </code>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                        {apiKey.isActive ? "Active" : "Revoked"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {apiKey.lastUsedAt
                          ? formatDateTime(apiKey.lastUsedAt)
                          : "Never used"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(apiKey.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {apiKey.isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* API documentation quick reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            API Quick Reference
          </CardTitle>
          <CardDescription>
            Common API endpoints for document generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="text-xs">POST</Badge>
              <code className="text-sm font-mono">/api/v1/generate</code>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Generate a document from a template with provided answers.
            </p>
            <pre className="rounded bg-muted p-3 text-xs overflow-x-auto">
{`{
  "templateId": "template_id",
  "answers": { "client_name": "Acme Corp", ... },
  "format": "pdf"
}`}
            </pre>
          </div>

          <div className="rounded-md border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">GET</Badge>
              <code className="text-sm font-mono">/api/v1/templates</code>
            </div>
            <p className="text-sm text-muted-foreground">
              List all templates in the workspace.
            </p>
          </div>

          <div className="rounded-md border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">GET</Badge>
              <code className="text-sm font-mono">/api/v1/responses</code>
            </div>
            <p className="text-sm text-muted-foreground">
              List all questionnaire responses.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
