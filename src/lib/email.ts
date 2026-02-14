import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      }
    : undefined,
})

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: from || process.env.FROM_EMAIL || "noreply@docgen.app",
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error("Failed to send email:", error)
    throw new Error("Failed to send email")
  }
}

export function questionnaireCompletedEmail(params: {
  recipientName: string
  questionnaireTitle: string
  respondentEmail: string
  responseUrl: string
}) {
  return {
    subject: `New response: ${params.questionnaireTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">New Questionnaire Response</h2>
        <p>Hi ${params.recipientName},</p>
        <p>A new response has been submitted for <strong>${params.questionnaireTitle}</strong>.</p>
        <p><strong>Respondent:</strong> ${params.respondentEmail}</p>
        <div style="margin: 24px 0;">
          <a href="${params.responseUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Response
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This is an automated notification from DocGen.</p>
      </div>
    `,
  }
}

export function signatureRequestEmail(params: {
  signerName: string
  documentName: string
  senderName: string
  signUrl: string
  message?: string
}) {
  return {
    subject: `Signature requested: ${params.documentName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Signature Requested</h2>
        <p>Hi ${params.signerName || "there"},</p>
        <p><strong>${params.senderName}</strong> has requested your signature on <strong>${params.documentName}</strong>.</p>
        ${params.message ? `<p style="padding: 12px; background: #f3f4f6; border-radius: 6px;">${params.message}</p>` : ""}
        <div style="margin: 24px 0;">
          <a href="${params.signUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Review & Sign
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This is an automated notification from DocGen.</p>
      </div>
    `,
  }
}

export function teamInvitationEmail(params: {
  inviteeEmail: string
  workspaceName: string
  inviterName: string
  inviteUrl: string
  role: string
}) {
  return {
    subject: `You've been invited to ${params.workspaceName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Workspace Invitation</h2>
        <p>Hi,</p>
        <p><strong>${params.inviterName}</strong> has invited you to join <strong>${params.workspaceName}</strong> as a <strong>${params.role}</strong>.</p>
        <div style="margin: 24px 0;">
          <a href="${params.inviteUrl}"
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
      </div>
    `,
  }
}
