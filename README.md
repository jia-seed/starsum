# starsum

aggregate stars from your pinned github repos and display a live-updating badge on your profile readme. one click setup.

**[starsum.jia.build](https://starsum.jia.build)**

## how it works

1. connect your github account
2. pick your repos (pinned or custom)
3. customize your badge color and style
4. click "create pull request"

the app creates a pr to your profile repo that adds a star count badge and a github action that auto-updates it every 6 hours.

## stack

- next.js 16, react 19, typescript
- auth.js (github oauth)
- octokit (github api + pr creation)
- tailwind css v4
- vercel
