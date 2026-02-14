import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, ClipboardList, MessageSquare, FolderOpen, Plus, ArrowRight } from "lucide-react"
import { formatDateTime } from "@/lib/utils"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user?.workspaceId) redirect("/login")

  const [templateCount, questionnaireCount, responseCount, documentCount, recentResponses, recentLogs] = await Promise.all([
    prisma.template.count({ where: { workspaceId: user.workspaceId, isActive: true } }),
    prisma.questionnaire.count({ where: { workspaceId: user.workspaceId, isActive: true } }),
    prisma.response.count({ where: { questionnaire: { workspaceId: user.workspaceId } } }),
    prisma.generatedDocument.count({ where: { template: { workspaceId: user.workspaceId } } }),
    prisma.response.findMany({
      where: { questionnaire: { workspaceId: user.workspaceId } },
      include: { questionnaire: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.auditLog.findMany({
      where: { workspaceId: user.workspaceId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  const stats = [
    { name: "Templates", value: templateCount, icon: FileText, href: "/templates" },
    { name: "Questionnaires", value: questionnaireCount, icon: ClipboardList, href: "/questionnaires" },
    { name: "Responses", value: responseCount, icon: MessageSquare, href: "/responses" },
    { name: "Documents", value: documentCount, icon: FolderOpen, href: "/documents" },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name || "User"}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/templates"><Button variant="outline"><Plus className="mr-2 h-4 w-4" />New Template</Button></Link>
          <Link href="/questionnaires"><Button><Plus className="mr-2 h-4 w-4" />New Questionnaire</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Responses</CardTitle>
            <CardDescription>Latest questionnaire submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No responses yet</p>
            ) : (
              <div className="space-y-3">
                {recentResponses.map((response) => (
                  <Link key={response.id} href={`/responses/${response.id}`} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{response.respondentName || response.respondentEmail || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{response.questionnaire.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={response.status === "COMPLETED" ? "default" : "secondary"}>
                        {response.status === "COMPLETED" ? "Completed" : "In Progress"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDateTime(response.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Audit log of recent actions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{log.user?.name || "System"}</span>
                      <span className="text-muted-foreground"> {log.action} </span>
                      <span className="text-muted-foreground">{log.resourceType}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
