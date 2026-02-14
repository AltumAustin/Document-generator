import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Building2,
  Palette,
  CreditCard,
  Save,
} from "lucide-react"

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user?.workspaceId) redirect("/login")

  const workspace = await prisma.workspace.findUnique({
    where: { id: user.workspaceId },
    include: {
      _count: { select: { users: true, templates: true, questionnaires: true } },
    },
  })

  if (!workspace) redirect("/login")

  const planLabels: Record<string, string> = {
    free: "Free",
    pro: "Pro",
    enterprise: "Enterprise",
  }

  const planColors: Record<string, string> = {
    free: "secondary",
    pro: "default",
    enterprise: "default",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace settings and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main settings form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Workspace Details
              </CardTitle>
              <CardDescription>
                Update your workspace name and branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action="/api/workspace" method="PATCH">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Workspace Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={workspace.name}
                      placeholder="My Workspace"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Workspace Slug</Label>
                    <Input
                      id="slug"
                      value={workspace.slug}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      The workspace slug is used in URLs and cannot be changed.
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="brandColor" className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Brand Color
                    </Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="brandColor"
                        name="brandColor"
                        type="color"
                        defaultValue={workspace.brandColor || "#2563eb"}
                        className="h-10 w-14 p-1 cursor-pointer"
                      />
                      <Input
                        name="brandColorHex"
                        defaultValue={workspace.brandColor || "#2563eb"}
                        placeholder="#2563eb"
                        className="max-w-[140px] font-mono text-sm"
                      />
                      <div
                        className="h-10 flex-1 rounded-md border"
                        style={{ backgroundColor: workspace.brandColor || "#2563eb" }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This color is used in shared questionnaire links and generated documents.
                    </p>
                  </div>

                  {workspace.logo && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label>Workspace Logo</Label>
                        <div className="flex items-center gap-4">
                          <img
                            src={workspace.logo}
                            alt="Workspace logo"
                            className="h-12 w-12 rounded-md border object-cover"
                          />
                          <div>
                            <p className="text-sm text-muted-foreground">Current logo</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-4">
                    <Button type="submit">
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Plan info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">
                    {planLabels[workspace.plan] || workspace.plan}
                  </span>
                  <Badge
                    variant={
                      (planColors[workspace.plan] as "default" | "secondary") || "secondary"
                    }
                  >
                    {workspace.plan === "free" ? "Free" : "Active"}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team members</span>
                    <span className="font-medium">{workspace._count.users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Templates</span>
                    <span className="font-medium">{workspace._count.templates}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Questionnaires</span>
                    <span className="font-medium">{workspace._count.questionnaires}</span>
                  </div>
                </div>

                {workspace.plan === "free" && (
                  <>
                    <Separator />
                    <Button variant="outline" className="w-full">
                      Upgrade to Pro
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Workspace info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Workspace Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workspace ID</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {workspace.id}
                  </code>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(workspace.createdAt))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
