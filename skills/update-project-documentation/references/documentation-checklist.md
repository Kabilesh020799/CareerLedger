# Documentation checklist

| Change | Required review |
| --- | --- |
| User-visible behavior | `README.md`, `features/v0.1`, relevant UI help text |
| Future behavior | `features/roadmap` only |
| API path, input, output, auth, or error | Route JSDoc, `backend/src/config/openapi.ts`, README API overview |
| Database model or retention | `docs/database.md`, Prisma migration notes, architecture/security when relevant |
| Environment variable or setup | `.env.example`, README configuration, `docs/deployment.md` |
| Authentication, authorization, files, OAuth, or secrets | `docs/security.md`, OpenAPI security contract, deployment guide |
| Service boundaries or data flow | `docs/architecture.md`, `CONTRIBUTING.md` if contributor rules change |
| Deployment or operations | `docs/deployment.md`, `docs/troubleshooting.md`, workflow comments/examples |
| Repeated failure mode | `docs/troubleshooting.md` |
| New or changed logic | Relevant unit tests and `docs/standards/testing.md` only if the standard changes |
| Release behavior | Root version and `CHANGELOG.md` through the release-version skill |

Never add secrets, real private documents, OAuth tokens, or production credentials to examples.
