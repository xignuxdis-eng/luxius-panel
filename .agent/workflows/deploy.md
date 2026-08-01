---
description: Build and deploy Luxius frontend to production
---

# Deploy Luxius Frontend

This workflow builds the Vite frontend and copies the output to the nginx production directory.

## Steps

// turbo-all

1. Build the frontend:

```
npx vite build
```

Working directory: `f:\Backup sistema Imprima\luxius_project`

1. Clean old assets from production:

```
Get-ChildItem "D:\XignuX\luxius-panel\dist\assets" -File | Remove-Item -Force
```

1. Copy new build to production:

```
Copy-Item -Path "f:\Backup sistema Imprima\luxius_project\dist\*" -Destination "D:\XignuX\luxius-panel\dist\" -Recurse -Force
```

1. Verify deployment:

```
Get-Content "D:\XignuX\luxius-panel\dist\index.html" | Select-String "index-"
```

This should show the new JS filename in the script tag.

## Notes

- After deploying, tell the user to do **Ctrl+Shift+R** (hard refresh) in the browser.
- Nginx serves from `D:\XignuX\luxius-panel\dist` (configured in `D:\XignuX\nginx\conf\nginx.conf`).
- The backend API runs on port 5000 and is proxied via nginx at `/api`.
