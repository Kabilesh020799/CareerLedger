"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("./generated/prisma/client");
const bcryptjs_1 = require("bcryptjs");
const demo_user_1 = require("./config/demo-user");
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
}
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString }),
});
const demoApplications = [
    {
        id: "demo-shopify-frontend",
        company: "Shopify",
        jobTitle: "Frontend Developer",
        location: "Remote — Canada",
        jobUrl: "https://www.shopify.com/careers",
        source: "Company Website",
        status: "INTERVIEW",
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
        status: "ASSESSMENT",
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
        status: "APPLIED",
        notes: "Submitted with the full-stack resume.",
        appliedAt: new Date("2026-08-04T00:00:00.000Z"),
    },
    {
        id: "demo-cove-quality-engineer",
        company: "Cove Labs",
        jobTitle: "Quality Engineer",
        location: "Halifax, NS",
        source: "Company Website",
        status: "APPLIED",
        notes: "Waiting for an update after submitting the application.",
        appliedAt: new Date("2026-07-20T00:00:00.000Z"),
        createdAt: new Date("2026-07-20T00:00:00.000Z"),
        updatedAt: new Date("2026-07-20T00:00:00.000Z"),
    },
    {
        id: "demo-volta-product-engineer",
        company: "Volta",
        jobTitle: "Product Engineer",
        location: "Halifax, NS",
        source: "Networking event",
        status: "SCREENING",
        notes: "Recruiter screen completed; waiting for next steps.",
        appliedAt: new Date("2026-08-05T00:00:00.000Z"),
    },
    {
        id: "demo-northstar-fullstack",
        company: "Northstar Labs",
        jobTitle: "Full Stack Developer",
        location: "Remote",
        source: "Indeed",
        status: "SAVED",
        notes: "Review the posting and tailor the resume before applying.",
        appliedAt: null,
    },
    {
        id: "demo-atlas-platform",
        company: "Atlas Systems",
        jobTitle: "Platform Developer",
        location: "Montreal, QC",
        source: "Company Website",
        status: "OFFER",
        notes: "Offer received; review compensation and benefits.",
        appliedAt: new Date("2026-07-14T00:00:00.000Z"),
    },
];
async function main() {
    const demoUsername = (process.env.DEMO_USER_USERNAME ?? demo_user_1.builtInDemoUser.username).toLowerCase();
    const demoPassword = process.env.DEMO_USER_PASSWORD ?? demo_user_1.builtInDemoUser.password;
    const passwordHash = await (0, bcryptjs_1.hash)(demoPassword, 12);
    const demoUser = await prisma.user.upsert({
        where: { username: demoUsername },
        create: {
            username: demoUsername,
            passwordHash,
            email: "demo@jobtracker.local",
            name: "Demo User",
        },
        update: {
            passwordHash,
            name: "Demo User",
        },
    });
    const result = await prisma.application.createMany({
        data: demoApplications.map((application) => ({
            ...application,
            userId: demoUser.id,
        })),
        skipDuplicates: true,
    });
    const claimed = await prisma.application.updateMany({
        where: {
            id: { in: demoApplications.map(({ id }) => id) },
            userId: null,
        },
        data: { userId: demoUser.id },
    });
    console.log(`Seed complete: demo user ready; ${result.count} application(s) created and ${claimed.count} legacy demo application(s) assigned.`);
}
main()
    .catch((error) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
