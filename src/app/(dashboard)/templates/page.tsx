import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-utils"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  Search,
  Copy,
} from "lucide-react"
import { CreateTemplateDialog } from "@/components/create-template-dialog"
import { formatDate } from "@/lib/utils"

interface TemplatesPageProps {
  searchParams: { search?: string; category?: string }
}

export default async function TemplatesPage({ searchParams }: TemplatesPageProps) {
  const user = await getCurrentUser()
  if (!user?.workspaceId) redirect("/login")

  const search = searchParams.search || ""
  const category = searchParams.category || ""

  const templates = await prisma.template.findMany({
    where: {
      workspaceId: user.workspaceId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
    },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { questionnaires: true, generatedDocs: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const categories = await prisma.template.groupBy({
    by: ["category"],
    where: { workspaceId: user.workspaceId, isActive: true },
    _count: true,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Manage your document templates
          </p>
        </div>
        <CreateTemplateDialog />
      </div>

      {/* Search and filter bar */}
      <div className="flex items-center gap-4">
        <form className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search templates..."
            defaultValue={search}
            className="pl-9"
          />
        </form>
        <div className="flex items-center gap-2">
          <Link href="/templates">
            <Badge variant={!category ? "default" : "outline"} className="cursor-pointer">
              All
            </Badge>
          </Link>
          {categories.map((cat) => (
            <Link key={cat.category} href={`/templates?category=${cat.category}`}>
              <Badge
                variant={category === cat.category ? "default" : "outline"}
                className="cursor-pointer"
              >
                {cat.category} ({cat._count})
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Template grid */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No templates found</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              {search
                ? `No templates match "${search}". Try a different search term.`
                : "Create your first template to start generating documents from questionnaire responses."}
            </p>
            {!search && <CreateTemplateDialog />}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{template.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description || "No description"}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/templates/${template.id}/edit`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
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
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{template.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      v{template.version}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{template._count.questionnaires} questionnaires</span>
                    <span>{template._count.generatedDocs} docs</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-xs text-muted-foreground">
                    {template.createdBy?.name || "Unknown"} &middot; {formatDate(template.updatedAt)}
                  </span>
                  <Link href={`/templates/${template.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="mr-1 h-3 w-3" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
