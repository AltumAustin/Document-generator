"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { FileText, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface ResponseActionsProps {
  responseId: string
  templateId?: string
  templateName?: string
}

export function ResponseActions({ responseId, templateId, templateName }: ResponseActionsProps) {
  const [format, setFormat] = useState<string>("pdf")
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/responses/${responseId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, templateId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Generation failed")
      }
      toast.success("Document generated successfully!")
      window.location.reload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate document")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Generate Document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {templateName && (
          <div className="text-sm">
            <span className="text-muted-foreground">Template: </span>
            <span className="font-medium">{templateName}</span>
          </div>
        )}
        <div className="space-y-2">
          <Label>Output Format</Label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">PDF</SelectItem>
              <SelectItem value="docx">DOCX</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="w-full" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Generate {format.toUpperCase()}
        </Button>
      </CardContent>
    </Card>
  )
}
