# starsum

aggregate stars from your github repos and display a live-updating badge on your profile readme. one click setup.

**[starsum.jia.build](https://starsum.jia.build)**

## how it works

1. connect your github account
2. pick your repos — pinned, all, or a custom selection
3. customize your badge color and style
4. click "create pull request"

the app creates a pr to your `username/username` profile repo (creates it if you don't have one) that adds:

- a shields.io star count badge wrapped in `<!--STARS_START-->` / `<!--STARS_END-->` comment markers
- a github action at `.github/workflows/update-stars.yml` that auto-updates the count every 6 hours

after merging, the workflow runs on a cron schedule, counts your stars via the github api, and pushes the updated badge to your readme automatically.

## auth flow

- github oauth via auth.js (next-auth v5 beta)
- requests `repo`, `workflow`, and `read:user` scopes so the app can create prs and push workflow files to your profile repo
- jwt strategy — access token stored in the jwt, exposed to server components via session callback
- on sign-in, the user's github id is added to a redis set for the site stats counter

## site stats

live stats pill in the top right corner powered by upstash redis (rest api, serverless-friendly). tracks:

- **active visitors** — sorted set with timestamps, pruned to a 5-min window
- **total views** — deduplicated per visitor per 5-min window using `SET NX EX 300`
- **unique github connections** — set of github user ids, incremented on sign-in and session refresh
- **recent users** — sorted set of users who clicked "create pull request", showing their username, avatar, and star count

the client component generates a uuid in `sessionStorage`, polls `/api/stats?vid=` every 30 seconds, and renders the stats. returns null until the first fetch to avoid layout shift.

### redis key design

| key | type | purpose |
|---|---|---|
| `stats:total_views` | string (incr) | total page views (deduplicated) |
| `stats:active_visitors` | sorted set | visitor ids scored by timestamp |
| `stats:unique_github` | set | unique github user ids |
| `stats:recent_users` | sorted set | json entries scored by timestamp |
| `stats:seen:{vid}` | string (set nx ex 300) | dedup views per visitor per 5 min |

## pr creation

the `/api/github/create-pr` endpoint:

1. checks if the user has a `username/username` profile repo, creates one if not
2. generates a readme update (inserts or replaces the badge between comment markers)
3. generates a github actions workflow yaml based on the selected mode (pinned/all/custom)
4. uses `octokit-plugin-create-pull-request` to create or update a pr on the `add-starsum` branch
5. on success, records the user's login, star count, and avatar to the `stats:recent_users` redis set

## project structure

```
src/
├── app/
│   ├── page.tsx                    # landing page (redirects to dashboard if authed)
│   ├── layout.tsx                  # root layout with session provider + site stats
│   ├── dashboard/page.tsx          # main dashboard
│   └── api/
│       ├── auth/[...nextauth]/     # next-auth route handler
│       ├── github/
│       │   ├── repos/route.ts      # fetch pinned + public repos
│       │   └── create-pr/route.ts  # create/update pr with badge + workflow
│       └── stats/route.ts          # site stats endpoint (redis)
├── components/
│   ├── BadgePreview.tsx            # badge preview
│   ├── ColorPicker.tsx             # color swatches
│   ├── DashboardClient.tsx         # dashboard ui
│   ├── RepoSelector.tsx            # repo selection (pinned/all/custom)
│   ├── SessionProvider.tsx         # next-auth session provider wrapper
│   ├── SiteStats.tsx               # live stats pill (client component)
│   └── StyleSelector.tsx           # badge style selector
└── lib/
    ├── auth.ts                     # next-auth config (github provider + callbacks)
    ├── github.ts                   # octokit helpers (repos, profile repo, graphql)
    ├── redis.ts                    # upstash redis client
    ├── utils.ts                    # badge url/markdown generation
    └── workflow-template.ts        # github actions workflow yaml generation
```

## stack

- next.js 16, react 19, typescript
- auth.js (github oauth)
- octokit (github api + pr creation)
- upstash redis (site stats)
- tailwind css v4
- vercel

## setup

```bash
npm install
cp .env.local.example .env.local
# fill in:
#   AUTH_SECRET (generate with `npx auth secret`)
#   AUTH_GITHUB_ID + AUTH_GITHUB_SECRET (from github oauth app)
#   UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (from console.upstash.com)
npm run dev
```
