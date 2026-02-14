import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create demo workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo-firm" },
    update: {},
    create: {
      name: "Demo Law Firm",
      slug: "demo-firm",
      brandColor: "#2563eb",
      plan: "professional",
    },
  })

  console.log("Created workspace:", workspace.name)

  // Create admin user
  const passwordHash = await bcrypt.hash("password123", 10)
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@demo.com" },
    update: {},
    create: {
      email: "admin@demo.com",
      name: "Admin User",
      passwordHash,
      role: Role.OWNER,
      workspaceId: workspace.id,
    },
  })

  console.log("Created admin user:", adminUser.email)

  // Create editor user
  const editorUser = await prisma.user.upsert({
    where: { email: "editor@demo.com" },
    update: {},
    create: {
      email: "editor@demo.com",
      name: "Editor User",
      passwordHash,
      role: Role.EDITOR,
      workspaceId: workspace.id,
    },
  })

  console.log("Created editor user:", editorUser.email)

  // Create viewer user
  const viewerUser = await prisma.user.upsert({
    where: { email: "viewer@demo.com" },
    update: {},
    create: {
      email: "viewer@demo.com",
      name: "Viewer User",
      passwordHash,
      role: Role.VIEWER,
      workspaceId: workspace.id,
    },
  })

  console.log("Created viewer user:", viewerUser.email)

  // Template 1: SAFE Agreement
  const safeTemplate = await prisma.template.upsert({
    where: { id: "seed-template-safe" },
    update: {},
    create: {
      id: "seed-template-safe",
      name: "SAFE Agreement",
      description: "Simple Agreement for Future Equity (SAFE) - Y Combinator standard template with variable fields for investor details, company information, and investment terms.",
      category: "Investments",
      variables: JSON.parse(JSON.stringify([
        { name: "company_name", type: "text", description: "Full legal name of the company" },
        { name: "company_state", type: "text", description: "State of incorporation" },
        { name: "investor_name", type: "text", description: "Full legal name of the investor" },
        { name: "investor_email", type: "text", description: "Investor email address" },
        { name: "investment_amount", type: "number", description: "Investment amount in USD" },
        { name: "valuation_cap", type: "number", description: "Valuation cap in USD" },
        { name: "discount_rate", type: "number", description: "Discount rate percentage" },
        { name: "has_mfn", type: "boolean", description: "Most Favored Nation clause" },
        { name: "has_pro_rata", type: "boolean", description: "Pro rata rights" },
        { name: "effective_date", type: "date", description: "Agreement effective date" },
        { name: "governing_law_state", type: "text", description: "Governing law state" },
        { name: "company_address", type: "text", description: "Company address" },
        { name: "investor_address", type: "text", description: "Investor address" },
        { name: "company_signatory", type: "text", description: "Company signatory name" },
        { name: "company_signatory_title", type: "text", description: "Company signatory title" },
      ])),
      version: 1,
      workspaceId: workspace.id,
      createdById: adminUser.id,
    },
  })

  console.log("Created template:", safeTemplate.name)

  // Template 2: NDA
  const ndaTemplate = await prisma.template.upsert({
    where: { id: "seed-template-nda" },
    update: {},
    create: {
      id: "seed-template-nda",
      name: "Non-Disclosure Agreement",
      description: "Standard mutual or one-way NDA for protecting confidential information between parties.",
      category: "General",
      variables: JSON.parse(JSON.stringify([
        { name: "nda_type", type: "text", description: "Mutual or One-Way" },
        { name: "disclosing_party_name", type: "text", description: "Disclosing party full name" },
        { name: "disclosing_party_address", type: "text", description: "Disclosing party address" },
        { name: "receiving_party_name", type: "text", description: "Receiving party full name" },
        { name: "receiving_party_address", type: "text", description: "Receiving party address" },
        { name: "effective_date", type: "date", description: "Agreement effective date" },
        { name: "confidentiality_period", type: "number", description: "Confidentiality period in years" },
        { name: "purpose", type: "text", description: "Purpose of disclosure" },
        { name: "governing_law_state", type: "text", description: "Governing law state" },
        { name: "has_non_solicitation", type: "boolean", description: "Include non-solicitation clause" },
        { name: "has_non_compete", type: "boolean", description: "Include non-compete clause" },
        { name: "non_compete_period", type: "number", description: "Non-compete period in months" },
        { name: "excluded_information", type: "text", description: "Specific excluded information" },
      ])),
      version: 1,
      workspaceId: workspace.id,
      createdById: adminUser.id,
    },
  })

  console.log("Created template:", ndaTemplate.name)

  // Template 3: Employment Offer Letter
  const employmentTemplate = await prisma.template.upsert({
    where: { id: "seed-template-employment" },
    update: {},
    create: {
      id: "seed-template-employment",
      name: "Employment Offer Letter",
      description: "Standard employment offer letter with compensation details, benefits, equity, and start date.",
      category: "Employment",
      variables: JSON.parse(JSON.stringify([
        { name: "company_name", type: "text", description: "Company name" },
        { name: "candidate_name", type: "text", description: "Candidate full name" },
        { name: "candidate_email", type: "text", description: "Candidate email" },
        { name: "position_title", type: "text", description: "Job title" },
        { name: "department", type: "text", description: "Department" },
        { name: "manager_name", type: "text", description: "Reporting manager name" },
        { name: "start_date", type: "date", description: "Start date" },
        { name: "employment_type", type: "text", description: "Full-time, Part-time, Contract" },
        { name: "salary", type: "number", description: "Annual salary in USD" },
        { name: "pay_frequency", type: "text", description: "Payment frequency" },
        { name: "has_equity", type: "boolean", description: "Includes equity compensation" },
        { name: "equity_shares", type: "number", description: "Number of stock options" },
        { name: "equity_vesting", type: "text", description: "Vesting schedule" },
        { name: "has_bonus", type: "boolean", description: "Includes bonus" },
        { name: "bonus_percentage", type: "number", description: "Annual bonus percentage" },
        { name: "benefits", type: "text", description: "Benefits summary" },
        { name: "pto_days", type: "number", description: "PTO days per year" },
        { name: "location", type: "text", description: "Work location" },
        { name: "is_remote", type: "boolean", description: "Remote work option" },
        { name: "offer_expiration", type: "date", description: "Offer expiration date" },
        { name: "hr_name", type: "text", description: "HR contact name" },
        { name: "hr_email", type: "text", description: "HR contact email" },
      ])),
      version: 1,
      workspaceId: workspace.id,
      createdById: adminUser.id,
    },
  })

  console.log("Created template:", employmentTemplate.name)

  // Create template versions
  for (const template of [safeTemplate, ndaTemplate, employmentTemplate]) {
    await prisma.templateVersion.upsert({
      where: {
        templateId_version: {
          templateId: template.id,
          version: 1,
        },
      },
      update: {},
      create: {
        templateId: template.id,
        version: 1,
        fileUrl: "",
        fileName: `${template.name.toLowerCase().replace(/\s+/g, "-")}-v1.docx`,
        variables: template.variables as object,
        changelog: "Initial version",
      },
    })
  }

  // Questionnaire 1: SAFE Agreement Questionnaire
  const safeQuestionnaire = await prisma.questionnaire.upsert({
    where: { id: "seed-questionnaire-safe" },
    update: {},
    create: {
      id: "seed-questionnaire-safe",
      title: "SAFE Agreement Intake",
      description: "Collect information to generate a SAFE agreement for new investors.",
      templateId: safeTemplate.id,
      settings: JSON.parse(JSON.stringify({
        allowSave: true,
        showProgressBar: true,
        requireEmail: true,
        submitButtonText: "Generate SAFE Agreement",
        confirmationMessage: "Thank you! Your SAFE agreement will be generated shortly.",
        notifyOnSubmission: true,
        notificationEmails: ["admin@demo.com"],
      })),
      workspaceId: workspace.id,
      createdById: adminUser.id,
    },
  })

  // SAFE questionnaire fields
  const safeFields = [
    { type: "short_text", label: "Company Legal Name", variable: "company_name", section: "Company Info", order: 0, isRequired: true, placeholder: "e.g., Acme Corp, Inc." },
    { type: "short_text", label: "State of Incorporation", variable: "company_state", section: "Company Info", order: 1, isRequired: true, placeholder: "e.g., Delaware" },
    { type: "address", label: "Company Address", variable: "company_address", section: "Company Info", order: 2, isRequired: true },
    { type: "short_text", label: "Company Signatory Name", variable: "company_signatory", section: "Company Info", order: 3, isRequired: true },
    { type: "short_text", label: "Company Signatory Title", variable: "company_signatory_title", section: "Company Info", order: 4, isRequired: true, placeholder: "e.g., CEO" },
    { type: "short_text", label: "Investor Full Legal Name", variable: "investor_name", section: "Investor Info", order: 5, isRequired: true },
    { type: "email", label: "Investor Email", variable: "investor_email", section: "Investor Info", order: 6, isRequired: true },
    { type: "address", label: "Investor Address", variable: "investor_address", section: "Investor Info", order: 7, isRequired: true },
    { type: "currency", label: "Investment Amount", variable: "investment_amount", section: "Terms", order: 8, isRequired: true, placeholder: "e.g., 500000" },
    { type: "currency", label: "Valuation Cap", variable: "valuation_cap", section: "Terms", order: 9, isRequired: true, placeholder: "e.g., 10000000" },
    { type: "number", label: "Discount Rate (%)", variable: "discount_rate", section: "Terms", order: 10, isRequired: false, placeholder: "e.g., 20" },
    { type: "yes_no", label: "Include Most Favored Nation Clause?", variable: "has_mfn", section: "Terms", order: 11, isRequired: true },
    { type: "yes_no", label: "Include Pro Rata Rights?", variable: "has_pro_rata", section: "Terms", order: 12, isRequired: true },
    { type: "date", label: "Effective Date", variable: "effective_date", section: "Terms", order: 13, isRequired: true },
    { type: "single_select", label: "Governing Law State", variable: "governing_law_state", section: "Terms", order: 14, isRequired: true, options: [
      { label: "Delaware", value: "Delaware" },
      { label: "California", value: "California" },
      { label: "New York", value: "New York" },
      { label: "Texas", value: "Texas" },
    ]},
  ]

  for (const field of safeFields) {
    await prisma.questionnaireField.create({
      data: {
        questionnaireId: safeQuestionnaire.id,
        type: field.type,
        label: field.label,
        variable: field.variable,
        section: field.section,
        order: field.order,
        isRequired: field.isRequired,
        placeholder: field.placeholder || null,
        options: field.options ? JSON.parse(JSON.stringify(field.options)) : [],
        validation: JSON.parse(JSON.stringify({ required: field.isRequired })),
      },
    })
  }

  // Questionnaire 2: NDA Questionnaire
  const ndaQuestionnaire = await prisma.questionnaire.upsert({
    where: { id: "seed-questionnaire-nda" },
    update: {},
    create: {
      id: "seed-questionnaire-nda",
      title: "NDA Generator",
      description: "Quickly generate a customized Non-Disclosure Agreement.",
      templateId: ndaTemplate.id,
      settings: JSON.parse(JSON.stringify({
        allowSave: true,
        showProgressBar: true,
        requireEmail: false,
        submitButtonText: "Generate NDA",
        confirmationMessage: "Your NDA has been generated successfully!",
        notifyOnSubmission: true,
        notificationEmails: ["admin@demo.com"],
      })),
      workspaceId: workspace.id,
      createdById: adminUser.id,
    },
  })

  const ndaFields = [
    { type: "single_select", label: "NDA Type", variable: "nda_type", section: "Agreement Type", order: 0, isRequired: true, options: [
      { label: "Mutual NDA", value: "Mutual" },
      { label: "One-Way NDA", value: "One-Way" },
    ]},
    { type: "short_text", label: "Disclosing Party Name", variable: "disclosing_party_name", section: "Disclosing Party", order: 1, isRequired: true },
    { type: "address", label: "Disclosing Party Address", variable: "disclosing_party_address", section: "Disclosing Party", order: 2, isRequired: true },
    { type: "short_text", label: "Receiving Party Name", variable: "receiving_party_name", section: "Receiving Party", order: 3, isRequired: true },
    { type: "address", label: "Receiving Party Address", variable: "receiving_party_address", section: "Receiving Party", order: 4, isRequired: true },
    { type: "date", label: "Effective Date", variable: "effective_date", section: "Terms", order: 5, isRequired: true },
    { type: "long_text", label: "Purpose of Disclosure", variable: "purpose", section: "Terms", order: 6, isRequired: true, placeholder: "Describe the purpose for sharing confidential information..." },
    { type: "number", label: "Confidentiality Period (Years)", variable: "confidentiality_period", section: "Terms", order: 7, isRequired: true },
    { type: "yes_no", label: "Include Non-Solicitation Clause?", variable: "has_non_solicitation", section: "Additional Clauses", order: 8, isRequired: true },
    { type: "yes_no", label: "Include Non-Compete Clause?", variable: "has_non_compete", section: "Additional Clauses", order: 9, isRequired: true },
    { type: "number", label: "Non-Compete Period (Months)", variable: "non_compete_period", section: "Additional Clauses", order: 10, isRequired: false },
    { type: "long_text", label: "Excluded Information (Optional)", variable: "excluded_information", section: "Additional Clauses", order: 11, isRequired: false },
    { type: "single_select", label: "Governing Law State", variable: "governing_law_state", section: "Terms", order: 12, isRequired: true, options: [
      { label: "Delaware", value: "Delaware" },
      { label: "California", value: "California" },
      { label: "New York", value: "New York" },
      { label: "Texas", value: "Texas" },
    ]},
  ]

  for (const field of ndaFields) {
    await prisma.questionnaireField.create({
      data: {
        questionnaireId: ndaQuestionnaire.id,
        type: field.type,
        label: field.label,
        variable: field.variable,
        section: field.section,
        order: field.order,
        isRequired: field.isRequired,
        placeholder: field.placeholder || null,
        options: field.options ? JSON.parse(JSON.stringify(field.options)) : [],
        validation: JSON.parse(JSON.stringify({ required: field.isRequired })),
      },
    })
  }

  // Add conditional logic for NDA: show non_compete_period only when has_non_compete is true
  const nonCompeteField = await prisma.questionnaireField.findFirst({
    where: { questionnaireId: ndaQuestionnaire.id, variable: "has_non_compete" },
  })
  const nonCompetePeriodField = await prisma.questionnaireField.findFirst({
    where: { questionnaireId: ndaQuestionnaire.id, variable: "non_compete_period" },
  })

  if (nonCompeteField && nonCompetePeriodField) {
    await prisma.conditionalLogic.create({
      data: {
        questionnaireId: ndaQuestionnaire.id,
        fieldId: nonCompetePeriodField.id,
        conditions: JSON.parse(JSON.stringify([
          {
            fieldId: nonCompeteField.id,
            operator: "equals",
            value: true,
            logicOperator: "AND",
          },
        ])),
        action: "show",
        targetFieldId: nonCompetePeriodField.id,
      },
    })
  }

  // Questionnaire 3: Employment Offer Letter
  const employmentQuestionnaire = await prisma.questionnaire.upsert({
    where: { id: "seed-questionnaire-employment" },
    update: {},
    create: {
      id: "seed-questionnaire-employment",
      title: "Employment Offer Letter Generator",
      description: "Generate a customized employment offer letter with compensation and benefits details.",
      templateId: employmentTemplate.id,
      settings: JSON.parse(JSON.stringify({
        allowSave: true,
        showProgressBar: true,
        requireEmail: true,
        submitButtonText: "Generate Offer Letter",
        confirmationMessage: "The offer letter has been generated and is ready for review.",
        notifyOnSubmission: true,
        notificationEmails: ["admin@demo.com"],
      })),
      workspaceId: workspace.id,
      createdById: adminUser.id,
    },
  })

  const employmentFields = [
    { type: "short_text", label: "Company Name", variable: "company_name", section: "Company", order: 0, isRequired: true },
    { type: "short_text", label: "Candidate Full Name", variable: "candidate_name", section: "Candidate", order: 1, isRequired: true },
    { type: "email", label: "Candidate Email", variable: "candidate_email", section: "Candidate", order: 2, isRequired: true },
    { type: "short_text", label: "Position Title", variable: "position_title", section: "Position", order: 3, isRequired: true },
    { type: "short_text", label: "Department", variable: "department", section: "Position", order: 4, isRequired: true },
    { type: "short_text", label: "Reporting Manager", variable: "manager_name", section: "Position", order: 5, isRequired: true },
    { type: "date", label: "Start Date", variable: "start_date", section: "Position", order: 6, isRequired: true },
    { type: "single_select", label: "Employment Type", variable: "employment_type", section: "Position", order: 7, isRequired: true, options: [
      { label: "Full-time", value: "Full-time" },
      { label: "Part-time", value: "Part-time" },
      { label: "Contract", value: "Contract" },
    ]},
    { type: "currency", label: "Annual Salary", variable: "salary", section: "Compensation", order: 8, isRequired: true },
    { type: "single_select", label: "Pay Frequency", variable: "pay_frequency", section: "Compensation", order: 9, isRequired: true, options: [
      { label: "Monthly", value: "Monthly" },
      { label: "Bi-weekly", value: "Bi-weekly" },
      { label: "Semi-monthly", value: "Semi-monthly" },
    ]},
    { type: "yes_no", label: "Includes Equity Compensation?", variable: "has_equity", section: "Compensation", order: 10, isRequired: true },
    { type: "number", label: "Number of Stock Options", variable: "equity_shares", section: "Compensation", order: 11, isRequired: false },
    { type: "short_text", label: "Vesting Schedule", variable: "equity_vesting", section: "Compensation", order: 12, isRequired: false, placeholder: "e.g., 4-year vest with 1-year cliff" },
    { type: "yes_no", label: "Includes Annual Bonus?", variable: "has_bonus", section: "Compensation", order: 13, isRequired: true },
    { type: "number", label: "Annual Bonus Percentage", variable: "bonus_percentage", section: "Compensation", order: 14, isRequired: false },
    { type: "long_text", label: "Benefits Summary", variable: "benefits", section: "Benefits", order: 15, isRequired: false },
    { type: "number", label: "PTO Days per Year", variable: "pto_days", section: "Benefits", order: 16, isRequired: true },
    { type: "short_text", label: "Work Location", variable: "location", section: "Work Details", order: 17, isRequired: true },
    { type: "yes_no", label: "Remote Work Option?", variable: "is_remote", section: "Work Details", order: 18, isRequired: true },
    { type: "date", label: "Offer Expiration Date", variable: "offer_expiration", section: "Work Details", order: 19, isRequired: true },
    { type: "short_text", label: "HR Contact Name", variable: "hr_name", section: "Contact", order: 20, isRequired: true },
    { type: "email", label: "HR Contact Email", variable: "hr_email", section: "Contact", order: 21, isRequired: true },
  ]

  for (const field of employmentFields) {
    await prisma.questionnaireField.create({
      data: {
        questionnaireId: employmentQuestionnaire.id,
        type: field.type,
        label: field.label,
        variable: field.variable,
        section: field.section,
        order: field.order,
        isRequired: field.isRequired,
        placeholder: field.placeholder || null,
        options: field.options ? JSON.parse(JSON.stringify(field.options)) : [],
        validation: JSON.parse(JSON.stringify({ required: field.isRequired })),
      },
    })
  }

  // Add conditional logic for employment: equity fields shown when has_equity is true
  const hasEquityField = await prisma.questionnaireField.findFirst({
    where: { questionnaireId: employmentQuestionnaire.id, variable: "has_equity" },
  })
  const equitySharesField = await prisma.questionnaireField.findFirst({
    where: { questionnaireId: employmentQuestionnaire.id, variable: "equity_shares" },
  })
  const equityVestingField = await prisma.questionnaireField.findFirst({
    where: { questionnaireId: employmentQuestionnaire.id, variable: "equity_vesting" },
  })

  if (hasEquityField && equitySharesField) {
    await prisma.conditionalLogic.create({
      data: {
        questionnaireId: employmentQuestionnaire.id,
        fieldId: equitySharesField.id,
        conditions: JSON.parse(JSON.stringify([
          { fieldId: hasEquityField.id, operator: "equals", value: true, logicOperator: "AND" },
        ])),
        action: "show",
        targetFieldId: equitySharesField.id,
      },
    })
  }

  if (hasEquityField && equityVestingField) {
    await prisma.conditionalLogic.create({
      data: {
        questionnaireId: employmentQuestionnaire.id,
        fieldId: equityVestingField.id,
        conditions: JSON.parse(JSON.stringify([
          { fieldId: hasEquityField.id, operator: "equals", value: true, logicOperator: "AND" },
        ])),
        action: "show",
        targetFieldId: equityVestingField.id,
      },
    })
  }

  // Bonus field conditional
  const hasBonusField = await prisma.questionnaireField.findFirst({
    where: { questionnaireId: employmentQuestionnaire.id, variable: "has_bonus" },
  })
  const bonusPercentageField = await prisma.questionnaireField.findFirst({
    where: { questionnaireId: employmentQuestionnaire.id, variable: "bonus_percentage" },
  })

  if (hasBonusField && bonusPercentageField) {
    await prisma.conditionalLogic.create({
      data: {
        questionnaireId: employmentQuestionnaire.id,
        fieldId: bonusPercentageField.id,
        conditions: JSON.parse(JSON.stringify([
          { fieldId: hasBonusField.id, operator: "equals", value: true, logicOperator: "AND" },
        ])),
        action: "show",
        targetFieldId: bonusPercentageField.id,
      },
    })
  }

  // Create shared links
  await prisma.sharedLink.upsert({
    where: { id: "seed-shared-safe" },
    update: {},
    create: {
      id: "seed-shared-safe",
      questionnaireId: safeQuestionnaire.id,
      slug: "safe-agreement-intake",
      isActive: true,
      branding: JSON.parse(JSON.stringify({
        companyName: "Demo Law Firm",
        primaryColor: "#2563eb",
      })),
    },
  })

  await prisma.sharedLink.upsert({
    where: { id: "seed-shared-nda" },
    update: {},
    create: {
      id: "seed-shared-nda",
      questionnaireId: ndaQuestionnaire.id,
      slug: "nda-generator",
      isActive: true,
      branding: JSON.parse(JSON.stringify({
        companyName: "Demo Law Firm",
        primaryColor: "#2563eb",
      })),
    },
  })

  await prisma.sharedLink.upsert({
    where: { id: "seed-shared-employment" },
    update: {},
    create: {
      id: "seed-shared-employment",
      questionnaireId: employmentQuestionnaire.id,
      slug: "employment-offer",
      isActive: true,
      branding: JSON.parse(JSON.stringify({
        companyName: "Demo Law Firm",
        primaryColor: "#2563eb",
      })),
    },
  })

  // Create sample responses
  const safeResponse = await prisma.response.create({
    data: {
      questionnaireId: safeQuestionnaire.id,
      respondentEmail: "investor@example.com",
      respondentName: "Jane Smith",
      status: "COMPLETED",
      completedAt: new Date(),
      answers: JSON.parse(JSON.stringify({
        company_name: "TechStartup, Inc.",
        company_state: "Delaware",
        company_address: "123 Innovation Way, San Francisco, CA 94105",
        company_signatory: "John Founder",
        company_signatory_title: "CEO",
        investor_name: "Jane Smith",
        investor_email: "investor@example.com",
        investor_address: "456 Investment Blvd, New York, NY 10001",
        investment_amount: 500000,
        valuation_cap: 10000000,
        discount_rate: 20,
        has_mfn: true,
        has_pro_rata: true,
        effective_date: "2024-03-15",
        governing_law_state: "Delaware",
      })),
    },
  })

  const ndaResponse = await prisma.response.create({
    data: {
      questionnaireId: ndaQuestionnaire.id,
      respondentEmail: "partner@example.com",
      respondentName: "Bob Johnson",
      status: "COMPLETED",
      completedAt: new Date(),
      answers: JSON.parse(JSON.stringify({
        nda_type: "Mutual",
        disclosing_party_name: "TechStartup, Inc.",
        disclosing_party_address: "123 Innovation Way, San Francisco, CA 94105",
        receiving_party_name: "Partner Corp",
        receiving_party_address: "789 Business Ave, Austin, TX 73301",
        effective_date: "2024-03-01",
        purpose: "Evaluation of potential strategic partnership for technology integration and joint product development.",
        confidentiality_period: 3,
        has_non_solicitation: true,
        has_non_compete: false,
        governing_law_state: "California",
      })),
    },
  })

  const employmentResponse = await prisma.response.create({
    data: {
      questionnaireId: employmentQuestionnaire.id,
      respondentEmail: "hr@example.com",
      respondentName: "HR Team",
      status: "COMPLETED",
      completedAt: new Date(),
      answers: JSON.parse(JSON.stringify({
        company_name: "TechStartup, Inc.",
        candidate_name: "Alice Developer",
        candidate_email: "alice@example.com",
        position_title: "Senior Software Engineer",
        department: "Engineering",
        manager_name: "Bob Manager",
        start_date: "2024-04-01",
        employment_type: "Full-time",
        salary: 180000,
        pay_frequency: "Semi-monthly",
        has_equity: true,
        equity_shares: 50000,
        equity_vesting: "4-year vest with 1-year cliff",
        has_bonus: true,
        bonus_percentage: 15,
        benefits: "Health, dental, and vision insurance. 401(k) with 4% company match. Commuter benefits.",
        pto_days: 20,
        location: "San Francisco, CA",
        is_remote: true,
        offer_expiration: "2024-03-25",
        hr_name: "Sarah HR",
        hr_email: "hr@techstartup.com",
      })),
    },
  })

  // Create an in-progress response
  await prisma.response.create({
    data: {
      questionnaireId: safeQuestionnaire.id,
      respondentEmail: "another-investor@example.com",
      respondentName: "Tom Investor",
      status: "IN_PROGRESS",
      answers: JSON.parse(JSON.stringify({
        company_name: "TechStartup, Inc.",
        investor_name: "Tom Investor",
        investor_email: "another-investor@example.com",
      })),
    },
  })

  // Create API key
  await prisma.apiKey.upsert({
    where: { id: "seed-api-key" },
    update: {},
    create: {
      id: "seed-api-key",
      workspaceId: workspace.id,
      key: `dk_${crypto.randomBytes(24).toString("hex")}`,
      name: "Development API Key",
      permissions: JSON.parse(JSON.stringify(["read", "write", "generate"])),
    },
  })

  // Create webhook endpoint
  await prisma.webhookEndpoint.upsert({
    where: { id: "seed-webhook" },
    update: {},
    create: {
      id: "seed-webhook",
      workspaceId: workspace.id,
      url: "https://webhook.site/test",
      events: JSON.parse(JSON.stringify(["response.completed", "document.generated"])),
      secret: crypto.randomBytes(32).toString("hex"),
      isActive: true,
    },
  })

  // Create audit logs
  const auditActions = [
    { action: "created", resourceType: "template", resourceId: safeTemplate.id, metadata: { name: "SAFE Agreement" } },
    { action: "created", resourceType: "template", resourceId: ndaTemplate.id, metadata: { name: "Non-Disclosure Agreement" } },
    { action: "created", resourceType: "template", resourceId: employmentTemplate.id, metadata: { name: "Employment Offer Letter" } },
    { action: "created", resourceType: "questionnaire", resourceId: safeQuestionnaire.id, metadata: { title: "SAFE Agreement Intake" } },
    { action: "created", resourceType: "questionnaire", resourceId: ndaQuestionnaire.id, metadata: { title: "NDA Generator" } },
    { action: "created", resourceType: "questionnaire", resourceId: employmentQuestionnaire.id, metadata: { title: "Employment Offer Letter Generator" } },
    { action: "shared", resourceType: "questionnaire", resourceId: safeQuestionnaire.id, metadata: { slug: "safe-agreement-intake" } },
    { action: "created", resourceType: "response", resourceId: safeResponse.id, metadata: { respondent: "investor@example.com" } },
    { action: "created", resourceType: "response", resourceId: ndaResponse.id, metadata: { respondent: "partner@example.com" } },
    { action: "created", resourceType: "response", resourceId: employmentResponse.id, metadata: { respondent: "hr@example.com" } },
  ]

  for (const log of auditActions) {
    await prisma.auditLog.create({
      data: {
        workspaceId: workspace.id,
        userId: adminUser.id,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        metadata: log.metadata,
      },
    })
  }

  console.log("\nSeed data created successfully!")
  console.log("\nLogin credentials:")
  console.log("  Admin: admin@demo.com / password123")
  console.log("  Editor: editor@demo.com / password123")
  console.log("  Viewer: viewer@demo.com / password123")
  console.log("\nPublic questionnaire links:")
  console.log("  SAFE: http://localhost:3000/q/safe-agreement-intake")
  console.log("  NDA: http://localhost:3000/q/nda-generator")
  console.log("  Employment: http://localhost:3000/q/employment-offer")
}

main()
  .catch((e) => {
    console.error("Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
