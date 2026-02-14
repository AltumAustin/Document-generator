import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils"
import { ArrowLeft, Download, Eye, FileText, BarChart3 } from "lucide-react"

interface PageProps {
  params: { id: string }
}

export default async function QuestionnaireResponsesPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.workspaceId) redirect("/login")

  const questionnaire = await prisma.questionnaire.findFirst({
    where: { id: params.id, workspaceId: user.workspaceId },
    include: {
      template: { select: { name: true } },
      _count: { select: { responses: true } },
    },
  })

  if (!questionnaire) redirect("/questionnaires")

  const responses = await prisma.response.findMany({
    where: { questionnaireId: params.id },
    include: {
      _count: { select: { generatedDocs: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const completedCount = responses.filter((r) => r.status === "COMPLETED").length
  const inProgressCount = responses.filter((r) => r.status === "IN_PROGRESS").length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/questionnaires">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{questionnaire.title}</h1>
          <p className="text-muted-foreground">
            {questionnaire.template?.name && `Template: ${questionnaire.template.name} · `}
            {questionnaire._count.responses} total responses
          </p>
        </div>
        <Link href={`/api/responses/export?questionnaireId=${params.id}&format=csv`}>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{inProgressCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Responses</CardTitle>
          <CardDescription>View and manage all submissions for this questionnaire.</CardDescription>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No responses yet</h3>
              <p className="text-muted-foreground mt-1">
                Share your questionnaire to start collecting responses.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Respondent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{response.respondentName || "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground">{response.respondentEmail || "No email"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          response.status === "COMPLETED"
                            ? "default"
                            : response.status === "IN_PROGRESS"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {response.status === "COMPLETED"
                          ? "Completed"
                          : response.status === "IN_PROGRESS"
                          ? "In Progress"
                          : "Archived"}
                      </Badge>
                    </TableCell>
                    <TableCell>{response._count.generatedDocs}</TableCell>
                    <TableCell>
                      {response.completedAt
                        ? formatDateTime(response.completedAt)
                        : formatDateTime(response.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/responses/${response.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
