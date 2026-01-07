# Deploying this repository to GitHub

Steps to publish this project to GitHub and enable CI + Pages:

1) Create a repository on GitHub (via web UI or `gh`):

```bash
# from repo root
git init
git add .
git commit -m "Initial commit"
git branch -M main
# create remote (replace USERNAME/REPO)
git remote add origin git@github.com:USERNAME/REPO.git
git push -u origin main
# OR use GitHub CLI:
gh repo create USERNAME/REPO --public --source=. --remote=origin --push
```

2) CI: The repository includes a Python CI workflow at `.github/workflows/ci.yml`.
- It runs `pytest` against `secure-data-sharing-main/backend` on pushes and PRs.

3) Frontend Pages: The Pages workflow `.github/workflows/pages.yml` builds the frontend under `secure-data-sharing-main/frontend` and deploys to GitHub Pages.
- Vite's build output is expected at `secure-data-sharing-main/frontend/dist`. Adjust `publish_dir` in the workflow if different.

4) Notes & secrets:
- No additional secrets are required; the workflows use `GITHUB_TOKEN` provided by Actions.
- Do not commit secrets or private keys to the repo.

5) Optional: If you want me to create the initial commit, set the remote, or help run these commands from this machine, tell me and I'll proceed (I cannot push to your GitHub without your credentials or `gh` access).
