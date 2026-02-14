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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ClipboardList,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  Link2,
  Link2Off,
  Eye,
  Copy,
  MessageSquare,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface QuestionnairesPageProps {
  searchParams: { search?: string }
}

export default async function QuestionnairesPage({ searchParams }: QuestionnairesPageProps) {
  const user = await getCurrentUser()
  if (!user?.workspaceId) redirect("/login")

  const search = searchParams.search || ""

  const questionnaires = await prisma.questionnaire.findMany({
    where: {
      workspaceId: user.workspaceId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      template: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      sharedLinks: { where: { isActive: true }, select: { id: true, slug: true } },
      _count: { select: { responses: true, fields: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const templates = await prisma.template.findMany({
    where: { workspaceId: user.workspaceId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Questionnaires</h1>
          <p className="text-muted-foreground">
            Create and manage data collection forms
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Questionnaire
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Questionnaire</DialogTitle>
              <DialogDescription>
                Set up a new questionnaire to collect data for document generation.
              </DialogDescription>
            </DialogHeader>
            <form action="/api/questionnaires" method="POST">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g. Client Onboarding Form"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the purpose of this questionnaire..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="templateId">Linked Template (optional)</Label>
                  <Select name="templateId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link a template to auto-generate documents from responses.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Create Questionnaire</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-4">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search questionnaires..."
            defaultValue={search}
            className="pl-9"
          />
        </form>
      </div>

      {/* Questionnaires table */}
      {questionnaires.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No questionnaires found</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              {search
                ? `No questionnaires match "${search}". Try a different search term.`
                : "Create your first questionnaire to start collecting data for document generation."}
            </p>
            {!search && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Questionnaire
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Questionnaire</DialogTitle>
                    <DialogDescription>
                      Set up a new questionnaire to collect data for document generation.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Use the main New Questionnaire button to get started.
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Linked Template</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Shared Link</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questionnaires.map((questionnaire) => {
                  const activeLink = questionnaire.sharedLinks[0]
                  return (
                    <TableRow key={questionnaire.id}>
                      <TableCell>
                        <div>
                          <Link
                            href={`/questionnaires/${questionnaire.id}/builder`}
                            className="font-medium hover:underline"
                          >
                            {questionnaire.title}
                          </Link>
                          {questionnaire.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {questionnaire.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {questionnaire.template ? (
                          <Link
                            href={`/templates/${questionnaire.template.id}/edit`}
                            className="text-sm hover:underline"
                          >
                            {questionnaire.template.name}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{questionnaire._count.fields}</span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/questionnaires/${questionnaire.id}/responses`}
                          className="flex items-center gap-1.5 text-sm hover:underline"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          {questionnaire._count.responses}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {activeLink ? (
                          <Badge variant="default" className="gap-1">
                            <Link2 className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-muted-foreground">
                            <Link2Off className="h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          <p>{questionnaire.createdBy?.name || "Unknown"}</p>
                          <p className="text-xs">{formatDate(questionnaire.createdAt)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/questionnaires/${questionnaire.id}/builder`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Builder
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/questionnaires/${questionnaire.id}/responses`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Responses
                              </Link>
                            </DropdownMenuItem>
                            {activeLink && (
                              <DropdownMenuItem>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open Shared Link
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
