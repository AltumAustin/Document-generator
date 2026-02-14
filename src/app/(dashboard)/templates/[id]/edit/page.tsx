"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  FileText,
  Variable,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react"
import { formatDateTime, formatFileSize } from "@/lib/utils"

interface TemplateVariable {
  name: string
  type: string
  defaultValue?: string
}

interface TemplateVersion {
  id: string
  version: number
  fileName: string | null
  changelog: string | null
  createdAt: string
}

interface TemplateData {
  id: string
  name: string
  description: string | null
  category: string
  fileUrl: string | null
  fileName: string | null
  variables: TemplateVariable[]
  version: number
  versions: TemplateVersion[]
  createdAt: string
  updatedAt: string
}

export default function TemplateEditPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.id as string

  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("General")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Fetch template data
  useEffect(() => {
    async function fetchTemplate() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/templates/${templateId}`)
        if (!response.ok) throw new Error("Failed to fetch template")
        const data: TemplateData = await response.json()
        setTemplate(data)
        setName(data.name)
        setDescription(data.description || "")
        setCategory(data.category)
      } catch (err) {
        setError("Failed to load template")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    if (templateId) {
      fetchTemplate()
    }
  }, [templateId])

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true)
      setSaveStatus("saving")

      const formData = new FormData()
      formData.append("name", name)
      formData.append("description", description)
      formData.append("category", category)
      if (selectedFile) {
        formData.append("file", selectedFile)
      }

      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PATCH",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save template")
      }

      const updatedTemplate: TemplateData = await response.json()
      setTemplate(updatedTemplate)
      setSelectedFile(null)
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (err) {
      setSaveStatus("error")
      setError(err instanceof Error ? err.message : "Failed to save")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } finally {
      setIsSaving(false)
    }
  }, [templateId, name, description, category, selectedFile])

  // File drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].name.endsWith(".docx")) {
      setSelectedFile(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setSelectedFile(files[0])
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading template...</p>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Template not found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {error || "The template you are looking for does not exist or you do not have access."}
          </p>
          <Button variant="outline" onClick={() => router.push("/templates")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/templates")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Template</h1>
            <p className="text-muted-foreground">
              Version {template.version} &middot; Last updated {formatDateTime(template.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error || "Save failed"}
            </span>
          )}
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main form - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic details */}
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>Basic information about this template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Template name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this template is used for..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* File upload */}
          <Card>
            <CardHeader>
              <CardTitle>Template File</CardTitle>
              <CardDescription>
                Upload a .docx file with variable placeholders (e.g. {"{{client_name}}"})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.fileName && !selectedFile && (
                <div className="flex items-center justify-between rounded-md border p-3 mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">{template.fileName}</p>
                      <p className="text-xs text-muted-foreground">Current template file</p>
                    </div>
                  </div>
                  <Badge variant="secondary">v{template.version}</Badge>
                </div>
              )}

              {selectedFile && (
                <div className="flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-3 mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)} &middot; New file (unsaved)
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium mb-1">
                  {isDragging ? "Drop your file here" : "Upload a new version"}
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Drag and drop a .docx file, or click to browse
                </p>
                <Input
                  type="file"
                  accept=".docx"
                  onChange={handleFileChange}
                  className="max-w-xs mx-auto"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Variable className="h-4 w-4" />
                Template Variables
              </CardTitle>
              <CardDescription>
                Variables detected in the template file
              </CardDescription>
            </CardHeader>
            <CardContent>
              {template.variables.length === 0 ? (
                <div className="text-center py-6">
                  <Variable className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No variables detected. Upload a .docx file with {"{{variable}}"} placeholders.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {template.variables.map((variable, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {`{{${variable.name}}}`}
                        </code>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {variable.type || "text"}
                      </Badge>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2">
                    {template.variables.length} variable{template.variables.length !== 1 ? "s" : ""} found
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Version history */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Version History
              </CardTitle>
              <CardDescription>Previous versions of this template</CardDescription>
            </CardHeader>
            <CardContent>
              {template.versions.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No previous versions yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {template.versions.map((version) => (
                    <div
                      key={version.id}
                      className="flex items-start justify-between border-b last:border-0 pb-3 last:pb-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              version.version === template.version
                                ? "default"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            v{version.version}
                          </Badge>
                          {version.version === template.version && (
                            <span className="text-xs text-green-600 font-medium">
                              Current
                            </span>
                          )}
                        </div>
                        {version.changelog && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {version.changelog}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {version.fileName || "Unknown file"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(version.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
