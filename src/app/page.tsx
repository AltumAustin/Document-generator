import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText, Zap, Shield, Share2 } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DocGen</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Document Generation
            <br />
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Create interactive questionnaires that automatically generate completed legal
            and business documents. Upload templates, build forms, share with clients,
            and generate documents in seconds.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                Start Free
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-t bg-muted/50 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">1. Upload Templates</h3>
                <p className="text-muted-foreground">
                  Upload your .docx templates with {'{{variable}}'} placeholders. We auto-detect
                  all merge fields and conditional logic blocks.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">2. Build Questionnaires</h3>
                <p className="text-muted-foreground">
                  Create drag-and-drop intake forms that map to your template variables.
                  Add conditional logic, validation, and multi-step flows.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Share2 className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">3. Share & Generate</h3>
                <p className="text-muted-foreground">
                  Share questionnaires via link. When clients complete them, documents are
                  automatically generated in .docx, PDF, or HTML format.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">Key Features</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: FileText, title: "Template Builder", desc: "WYSIWYG editor with variable insertion and conditional logic" },
                { icon: Zap, title: "Smart Forms", desc: "Drag-and-drop form builder with 16+ field types and branching logic" },
                { icon: Shield, title: "E-Signatures", desc: "Built-in electronic signature capture with audit trail" },
                { icon: Share2, title: "API & Webhooks", desc: "REST API for programmatic generation and webhook integrations" },
              ].map((feature, i) => (
                <div key={i} className="rounded-lg border p-6">
                  <feature.icon className="mb-3 h-8 w-8 text-primary" />
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>DocGen - Document Generation Platform</p>
        </div>
      </footer>
    </div>
  )
}
