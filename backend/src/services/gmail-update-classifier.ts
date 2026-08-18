import type { ApplicationStatus } from "../generated/prisma/client";

export type GmailMessageMetadata = {
  id: string;
  threadId: string | null;
  subject: string;
  sender: string;
  receivedAt: Date | null;
  snippet: string;
};

export type GmailApplicationCandidate = {
  id: string;
  company: string;
  jobTitle: string;
  appliedAt: Date | null;
  createdAt: Date;
};

export type GmailClassification = {
  status: ApplicationStatus;
  confidence: number;
  company?: string | null;
  jobTitle?: string | null;
};

const classificationRules: Array<{
  status: ApplicationStatus;
  phrases: string[];
}> = [
  {
    status: "OFFER",
    phrases: ["pleased to offer", "offer of employment", "job offer"],
  },
  {
    status: "REJECTED",
    phrases: [
      "will not be moving forward",
      "not be moving forward",
      "decided not to proceed",
      "other candidates",
      "position has been filled",
    ],
  },
  {
    status: "INTERVIEW",
    phrases: [
      "schedule an interview",
      "schedule your interview",
      "interview invitation",
      "invite you to interview",
    ],
  },
  {
    status: "ASSESSMENT",
    phrases: [
      "coding assessment",
      "technical assessment",
      "take-home assignment",
      "skills assessment",
    ],
  },
  {
    status: "SCREENING",
    phrases: ["phone screen", "screening call", "recruiter call"],
  },
  {
    status: "APPLIED",
    phrases: [
      "thank you for applying",
      "thank you for your application",
      "thanks for your application",
      "application received",
      "received your application",
      "we have received your application",
      "application confirmation",
    ],
  },
];

export function classifyGmailMessage(
  message: Pick<GmailMessageMetadata, "subject" | "snippet">,
): GmailClassification | null {
  if (isApplicationAcknowledgement(message.subject)) {
    return { status: "APPLIED", confidence: 95 };
  }

  if (isPersonalizedInterestRejection(message.subject)) {
    return { status: "REJECTED", confidence: 95 };
  }

  const content = normalize(`${message.subject} ${message.snippet}`);
  for (const rule of classificationRules) {
    if (rule.phrases.some((phrase) => content.includes(phrase))) {
      return { status: rule.status, confidence: 95 };
    }
  }

  if (isCompanyInterestAcknowledgement(message.subject)) {
    return { status: "APPLIED", confidence: 90 };
  }
  return null;
}

function isApplicationAcknowledgement(subject: string) {
  const normalizedSubject = subject
    .replace(/^(?:re|fw|fwd):\s*/i, "")
    .trim();

  return /^(?:thanks|thank you)\s+for\s+applying\s+to\s+[^\n]{2,120}$/i.test(
    normalizedSubject,
  );
}

function isPersonalizedInterestRejection(subject: string) {
  const normalizedSubject = subject
    .replace(/^(?:re|fw|fwd):\s*/i, "")
    .trim();

  return /^(?:thanks|thank you)\s+for\s+your\s+interest\s+in\s+[^,\n]{2,120},\s*[a-z][a-z .'-]{0,79}$/i.test(
    normalizedSubject,
  );
}

function isCompanyInterestAcknowledgement(subject: string) {
  const normalizedSubject = subject
    .replace(/^(?:re|fw|fwd):\s*/i, "")
    .trim();
  const target = normalizedSubject.match(
    /^(?:thanks|thank you)\s+for\s+your\s+interest\s+in\s+([^,\n]{2,120})$/i,
  )?.[1]?.trim();

  if (!target || /^(?:our|the|this|a|an|your)\b/i.test(target)) return false;
  return !/\bnewsletter\b/i.test(target);
}

export function matchGmailMessage(
  message: Pick<GmailMessageMetadata, "subject" | "sender" | "receivedAt">,
  applications: GmailApplicationCandidate[],
) {
  const scored = applications
    .map((application) => ({
      application,
      score: applicationMatchScore(message, application),
    }))
    .sort((left, right) => right.score - left.score);
  const best = scored[0];
  const next = scored[1];

  if (!best || best.score < 55 || next?.score === best.score) return null;
  return { applicationId: best.application.id, confidence: best.score };
}

export function inferCompany(sender: string) {
  const displayName = sender.match(/^\s*"?([^"<]+?)"?\s*</)?.[1]?.trim();
  if (displayName) {
    const cleaned = displayName
      .replace(/\b(recruiting|recruitment|careers?|talent|jobs?|team)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (cleaned.length >= 2) return cleaned;
  }

  const address = sender.match(/<?([^<>\s]+@[^<>\s]+)>?/)?.[1];
  const domainPart = address?.split("@")[1]?.split(".")[0];
  if (!domainPart || /^(gmail|outlook|hotmail|yahoo)$/i.test(domainPart)) return "";
  return titleCase(domainPart.replace(/[-_]+/g, " "));
}

export function inferJobTitle(subject: string, snippet = "") {
  const normalizedSubject = subject
    .replace(/^(re|fw|fwd):\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(?:thank you|thanks)\s+for\s+(?:submitting\s+)?your\s+application\b/i.test(normalizedSubject)) {
    return "";
  }
  const patterns = [
    /(?:application|interview|assessment|offer)\s+(?:for|for the)\s+(.+?)(?:\s+(?:role|position))?$/i,
    /^(.+?)\s+(?:interview|assessment|application|offer)(?:\s|$)/i,
    /(?:application|interview|assessment|offer)\s+(?:for|for the)\s+(?:the\s+)?(.+?)\s+(?:role|position)\b/i,
    /(?:role|position)\s*:\s*([^,.\n]{2,120})/i,
    /(?:your application|regarding your application)\s*(?:for|:)?\s*([^,.\n]{2,120})/i,
  ];
  const searchableText = `${normalizedSubject} ${snippet}`.replace(/\s+/g, " ").trim();
  for (const pattern of patterns) {
    const match = searchableText.match(pattern)?.[1]?.trim();
    if (match && match.length >= 2 && match.length <= 120) {
      return match
        .replace(/^the\s+/i, "")
        .replace(/\s+(?:role|position)\.?$/i, "")
        .replace(/[.!?]+$/, "")
        .trim();
    }
  }
  return "";
}

function applicationMatchScore(
  message: Pick<GmailMessageMetadata, "subject" | "sender" | "receivedAt">,
  application: GmailApplicationCandidate,
) {
  const subject = normalize(message.subject);
  const sender = normalize(message.sender);
  const company = normalize(application.company);
  const jobTitle = normalize(application.jobTitle);
  let score = 0;

  if (company.length >= 3 && subject.includes(company)) score += 45;
  if (jobTitle.length >= 4 && subject.includes(jobTitle)) score += 45;
  if (company.length >= 3 && sender.includes(company)) score += 55;

  const companyTokens = meaningfulTokens(company);
  const titleTokens = meaningfulTokens(jobTitle);
  score += overlapScore(companyTokens, meaningfulTokens(`${subject} ${sender}`), 30);
  score += overlapScore(titleTokens, meaningfulTokens(subject), 35);

  if (message.receivedAt) {
    const referenceDate = application.appliedAt ?? application.createdAt;
    const days = Math.abs(message.receivedAt.getTime() - referenceDate.getTime()) / 86_400_000;
    if (days <= 120) score += 10;
  }

  return Math.min(score, 100);
}

function overlapScore(source: string[], target: string[], maximum: number) {
  if (!source.length) return 0;
  const targetSet = new Set(target);
  const matches = source.filter((token) => targetSet.has(token)).length;
  return Math.round((matches / source.length) * maximum);
}

function meaningfulTokens(value: string) {
  return value.split(" ").filter((token) => token.length >= 3);
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
