import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const demoApplications = [
  {
    id: "demo-shopify-frontend",
    company: "Shopify",
    jobTitle: "Frontend Developer",
    location: "Remote — Canada",
    jobUrl: "https://www.shopify.com/careers",
    source: "Company Website",
    status: "INTERVIEW" as const,
    notes: "Second-round interview scheduled for next week.",
    appliedAt: new Date("2026-07-28T00:00:00.000Z"),
  },
  {
    id: "demo-rbc-data-analyst",
    company: "RBC",
    jobTitle: "Data Analyst",
    location: "Toronto, ON",
    jobUrl: "https://jobs.rbc.com/ca/en",
    source: "LinkedIn",
    status: "ASSESSMENT" as const,
    notes: "Complete the online assessment before Friday.",
    appliedAt: new Date("2026-08-01T00:00:00.000Z"),
  },
  {
    id: "demo-openai-software-engineer",
    company: "OpenAI",
    jobTitle: "Software Engineer",
    location: "San Francisco, CA",
    jobUrl: "https://openai.com/careers",
    source: "Referral",
    status: "APPLIED" as const,
    notes: "Submitted with the full-stack resume.",
    appliedAt: new Date("2026-08-04T00:00:00.000Z"),
  },
  {
    id: "demo-volta-product-engineer",
    company: "Volta",
    jobTitle: "Product Engineer",
    location: "Halifax, NS",
    source: "Networking event",
    status: "SCREENING" as const,
    notes: "Recruiter screen completed; waiting for next steps.",
    appliedAt: new Date("2026-08-05T00:00:00.000Z"),
  },
  {
    id: "demo-northstar-fullstack",
    company: "Northstar Labs",
    jobTitle: "Full Stack Developer",
    location: "Remote",
    source: "Indeed",
    status: "SAVED" as const,
    notes: "Review the posting and tailor the resume before applying.",
    appliedAt: null,
  },
  {
    id: "demo-atlas-platform",
    company: "Atlas Systems",
    jobTitle: "Platform Developer",
    location: "Montreal, QC",
    source: "Company Website",
    status: "OFFER" as const,
    notes: "Offer received; review compensation and benefits.",
    appliedAt: new Date("2026-07-14T00:00:00.000Z"),
  },
];

async function main() {
  const result = await prisma.application.createMany({
    data: demoApplications,
    skipDuplicates: true,
  });

  console.log(`Seed complete: ${result.count} demo application(s) created.`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
