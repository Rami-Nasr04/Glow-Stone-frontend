// The newsletter (contract "Announcements", 2026-11-03): Omar writes to the news list from the studio.

export interface Announcement {
  id: number
  subject: string
  /** As Omar typed it: paragraphs separated by a blank line. */
  message: string
  /** The featured piece; null for none, or deleted since. */
  productId: number | null
  /** How many it went to. */
  recipients: number
  sentAt: string
}

export interface AnnouncementList {
  /** How many people a send would reach now. */
  subscribers: number
  /** Newest first. */
  announcements: Announcement[]
}

export interface AnnouncementDraft {
  subject: string
  message: string
  productId: number | null
}

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value)

function fail(message: string): never {
  throw new Error(message)
}

function readAnnouncementRow(value: unknown, label: string): Announcement {
  if (!isObject(value)) fail(`${label} must be an object`)
  const { id, subject, message, productId, recipients, sentAt } = value
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) fail(`${label}: id must be a whole number`)
  if (typeof subject !== "string") fail(`announcement ${id}: subject must be text`)
  if (typeof message !== "string") fail(`announcement ${id}: message must be text`)
  if (productId !== null && (typeof productId !== "number" || !Number.isInteger(productId))) fail(`announcement ${id}: productId must be a whole number or null`)
  if (typeof recipients !== "number" || !Number.isInteger(recipients) || recipients < 0) fail(`announcement ${id}: recipients must be a count`)
  if (typeof sentAt !== "string" || Number.isNaN(Date.parse(sentAt))) fail(`announcement ${id}: sentAt must be a date`)
  return { id, subject, message, productId, recipients, sentAt }
}

export function readAnnouncement(value: unknown): Announcement {
  return readAnnouncementRow(value, "the announcement")
}

export function readAnnouncementList(value: unknown): AnnouncementList {
  if (!isObject(value)) fail("the announcements must be an object")
  const { subscribers, announcements } = value
  if (typeof subscribers !== "number" || !Number.isInteger(subscribers) || subscribers < 0) fail("subscribers must be a count")
  if (!Array.isArray(announcements)) fail("announcements must be a list")
  return { subscribers, announcements: announcements.map((row, i) => readAnnouncementRow(row, `announcement ${i + 1}`)) }
}

export function readTestSent(value: unknown): string {
  if (!isObject(value) || typeof value.sentTo !== "string" || value.sentTo === "") fail("sentTo must be an email address")
  return value.sentTo
}

/** The message as Omar will read it back: one paragraph per blank line, single line breaks kept inside. */
export function paragraphsOf(message: string): string[] {
  return message
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "")
}
