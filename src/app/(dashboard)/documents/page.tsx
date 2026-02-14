import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  FolderOpen,
  Download,
  FileText,
  Search,
  FileType,
  File,
} from "lucide-react"
import { formatDateTime, formatFileSize } from "@/lib/utils"

interface DocumentsPageProps {
  searchParams: { search?: string; format?: string }
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const user = await getCurrentUser()
  if (!user?.workspaceId) redirect("/login")

  const search = searchParams.search || ""
  const format = searchParams.format || ""

  const documents = await prisma.generatedDocument.findMany({
    where: {
      template: { workspaceId: user.workspaceId },
      ...(search
        ? { fileName: { contains: search, mode: "insensitive" } }
        : {}),
      ...(format ? { format: format as "DOCX" | "PDF" | "HTML" } : {}),
    },
    include: {
      template: { select: { name: true } },
      response: {
        select: {
          respondentName: true,
          respondentEmail: true,
          questionnaire: { select: { title: true } },
        },
      },
    },
    orderBy: { generatedAt: "desc" },
  })

  const formatCounts = await prisma.generatedDocument.groupBy({
    by: ["format"],
    where: { template: { workspaceId: user.workspaceId } },
    _count: true,
  })

  const formatIconMap: Record<string, string> = {
    DOCX: "text-blue-600",
    PDF: "text-red-600",
    HTML: "text-orange-600",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            All generated documents across your workspace
          </p>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="flex items-center gap-4">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search documents..."
            defaultValue={search}
            className="pl-9"
          />
        </form>
        <div className="flex items-center gap-2">
          <Link href="/documents">
            <Badge variant={!format ? "default" : "outline"} className="cursor-pointer">
              All ({documents.length})
            </Badge>
          </Link>
          {formatCounts.map((fc) => (
            <Link key={fc.format} href={`/documents?format=${fc.format}`}>
              <Badge
                variant={format === fc.format ? "default" : "outline"}
                className="cursor-pointer"
              >
                {fc.format} ({fc._count})
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Documents table */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No documents found</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              {search
                ? `No documents match "${search}". Try a different search term.`
                : "Documents will appear here once you generate them from questionnaire responses."}
            </p>
            {!search && (
              <Link href="/questionnaires">
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Go to Questionnaires
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Respondent</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileText
                          className={`h-5 w-5 flex-shrink-0 ${
                            formatIconMap[doc.format] || "text-muted-foreground"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[250px]">
                            {doc.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.response.questionnaire.title}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          doc.format === "PDF"
                            ? "border-red-200 text-red-700 bg-red-50"
                            : doc.format === "DOCX"
                            ? "border-blue-200 text-blue-700 bg-blue-50"
                            : "border-orange-200 text-orange-700 bg-orange-50"
                        }
                      >
                        {doc.format}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{doc.template.name}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">
                          {doc.response.respondentName || "Anonymous"}
                        </p>
                        {doc.response.respondentEmail && (
                          <p className="text-xs text-muted-foreground">
                            {doc.response.respondentEmail}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {doc.fileSize ? formatFileSize(doc.fileSize) : "--"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(doc.generatedAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <a href={doc.fileUrl} download={doc.fileName}>
                        <Button variant="ghost" size="sm">
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
