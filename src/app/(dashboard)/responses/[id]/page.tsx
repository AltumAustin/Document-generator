import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Download,
  FileText,
  FileUp,
  Mail,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { formatDateTime, formatFileSize } from "@/lib/utils"

interface PageProps {
  params: { id: string }
}

export default async function ResponseDetailPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user?.workspaceId) redirect("/login")

  const response = await prisma.response.findFirst({
    where: {
      id: params.id,
      questionnaire: { workspaceId: user.workspaceId },
    },
    include: {
      questionnaire: {
        select: {
          id: true,
          title: true,
          templateId: true,
          template: { select: { id: true, name: true } },
          fields: {
            select: { variable: true, label: true, type: true },
            orderBy: { order: "asc" },
          },
        },
      },
      generatedDocs: {
        include: {
          template: { select: { name: true } },
        },
        orderBy: { generatedAt: "desc" },
      },
    },
  })

  if (!response) redirect("/questionnaires")

  const answers = (response.answers as Record<string, unknown>) || {}
  const metadata = (response.metadata as Record<string, unknown>) || {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/questionnaires/${response.questionnaire.id}/responses`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Response Details</h1>
            <p className="text-muted-foreground">
              {response.questionnaire.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {response.questionnaire.templateId && (
            <form action={`/api/responses/${response.id}/generate`} method="POST">
              <Button type="submit">
                <FileUp className="mr-2 h-4 w-4" />
                Generate Document
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Response metadata cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Respondent</p>
                <p className="text-sm font-medium">
                  {response.respondentName || "Anonymous"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">
                  {response.respondentEmail || "Not provided"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {response.status === "COMPLETED" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : response.status === "IN_PROGRESS" ? (
                <Clock className="h-5 w-5 text-yellow-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
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
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm font-medium">
                  {response.completedAt
                    ? formatDateTime(response.completedAt)
                    : formatDateTime(response.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Answers section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Answers</CardTitle>
              <CardDescription>
                All responses submitted for this questionnaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              {response.questionnaire.fields.length === 0 &&
              Object.keys(answers).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No answers recorded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {response.questionnaire.fields.map((field) => {
                    const answer = answers[field.variable]
                    const displayValue =
                      answer === null || answer === undefined || answer === ""
                        ? "Not answered"
                        : Array.isArray(answer)
                        ? answer.join(", ")
                        : String(answer)

                    return (
                      <div key={field.variable} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{field.label}</p>
                          <Badge variant="outline" className="text-xs">
                            {field.type}
                          </Badge>
                        </div>
                        <p
                          className={`text-sm ${
                            answer === null ||
                            answer === undefined ||
                            answer === ""
                              ? "text-muted-foreground italic"
                              : ""
                          }`}
                        >
                          {displayValue}
                        </p>
                        <Separator />
                      </div>
                    )
                  })}

                  {/* Show any additional answers not mapped to fields */}
                  {Object.entries(answers)
                    .filter(
                      ([key]) =>
                        !response.questionnaire.fields.some(
                          (f) => f.variable === key
                        )
                    )
                    .map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{key}</p>
                          <Badge variant="outline" className="text-xs">
                            unmapped
                          </Badge>
                        </div>
                        <p className="text-sm">
                          {Array.isArray(value) ? value.join(", ") : String(value)}
                        </p>
                        <Separator />
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Documents & Metadata */}
        <div className="space-y-6">
          {/* Generated Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Generated Documents</span>
                <Badge variant="secondary">{response.generatedDocs.length}</Badge>
              </CardTitle>
              <CardDescription>
                Documents generated from this response
              </CardDescription>
            </CardHeader>
            <CardContent>
              {response.generatedDocs.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No documents generated yet
                  </p>
                  {response.questionnaire.templateId && (
                    <form action={`/api/responses/${response.id}/generate`} method="POST">
                      <Button variant="outline" size="sm" type="submit">
                        <FileUp className="mr-1.5 h-3.5 w-3.5" />
                        Generate Now
                      </Button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {response.generatedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.fileName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">
                              {doc.format}
                            </Badge>
                            {doc.fileSize && (
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(doc.fileSize)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDateTime(doc.generatedAt)}
                          </p>
                        </div>
                      </div>
                      <a href={doc.fileUrl} download={doc.fileName}>
                        <Button variant="ghost" size="icon" className="flex-shrink-0">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
              <CardDescription>Additional information about this response</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Response ID</span>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {response.id}
                  </code>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{formatDateTime(response.createdAt)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{formatDateTime(response.updatedAt)}</span>
                </div>
                {response.completedAt && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span>{formatDateTime(response.completedAt)}</span>
                    </div>
                  </>
                )}
                {Object.keys(metadata).length > 0 && (
                  <>
                    <Separator />
                    {Object.entries(metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="text-xs">{String(value)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
