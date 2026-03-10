interface WorkflowOptions {
  mode: "pinned" | "custom";
  color: string;
  style: string;
  repos?: Array<{ owner: string; name: string }>;
}

export function generateWorkflow(options: WorkflowOptions): string {
  const { mode, color, style, repos } = options;
  const script =
    mode === "pinned"
      ? generatePinnedScript(color, style)
      : generateCustomScript(color, style, repos || []);

  return `name: Update Total Stars

on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  update-stars:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Count stars and update README
        uses: actions/github-script@v7
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
          script: |
${indent(script, 12)}

      - name: Commit changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git diff --quiet || (git add README.md && git commit -m "update total stars count" && git push)
`;
}

function generatePinnedScript(color: string, style: string): string {
  return `const fs = require('fs');

const query = \`{
  user(login: "\${{ github.repository_owner }}") {
    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          owner { login }
          stargazerCount
        }
      }
    }
  }
}\`;

const result = await github.graphql(query);
const pinnedRepos = result.user.pinnedItems.nodes;

let totalStars = 0;
for (const repo of pinnedRepos) {
  totalStars += repo.stargazerCount;
  console.log(\`\${repo.owner.login}/\${repo.name}: \${repo.stargazerCount}\`);
}

console.log(\`total: \${totalStars}\`);

let readme = fs.readFileSync('README.md', 'utf8');
readme = readme.replace(
  /<!--STARS_START-->[\\s\\S]*?<!--STARS_END-->/,
  \`<!--STARS_START-->\\n![Total Stars](https://img.shields.io/badge/total__stars-\${totalStars}-${color}?style=${style}&logo=github)\\n<!--STARS_END-->\`
);
fs.writeFileSync('README.md', readme);`;
}

function generateCustomScript(
  color: string,
  style: string,
  repos: Array<{ owner: string; name: string }>
): string {
  const repoList = repos
    .map((r) => `  { owner: '${r.owner}', repo: '${r.name}' }`)
    .join(",\n");

  return `const fs = require('fs');

const repos = [
${repoList}
];

let totalStars = 0;
for (const { owner, repo } of repos) {
  try {
    const { data } = await github.rest.repos.get({ owner, repo });
    totalStars += data.stargazers_count;
    console.log(\`\${owner}/\${repo}: \${data.stargazers_count}\`);
  } catch (e) {
    console.log(\`failed to fetch \${owner}/\${repo}: \${e.message}\`);
  }
}

console.log(\`total: \${totalStars}\`);

let readme = fs.readFileSync('README.md', 'utf8');
readme = readme.replace(
  /<!--STARS_START-->[\\s\\S]*?<!--STARS_END-->/,
  \`<!--STARS_START-->\\n![Total Stars](https://img.shields.io/badge/total__stars-\${totalStars}-${color}?style=${style}&logo=github)\\n<!--STARS_END-->\`
);
fs.writeFileSync('README.md', readme);`;
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => pad + line)
    .join("\n");
}
