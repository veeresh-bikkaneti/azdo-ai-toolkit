# How to Publish `ai-initiative-scaffolder` to VS Code Marketplace

## Prerequisites
1.  **Microsoft Account**: You need a personal Microsoft account.
2.  **Azure DevOps Organization**: Required to create the required Personal Access Token (PAT).
3.  **Publisher ID**: A unique identifier for you on the Marketplace.

## Step 1: Create a Publisher
1.  Go to the [Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
2.  Log in with your Microsoft account.
3.  Click **"Create publisher"**.
4.  Enter a unique **ID** (e.g., `veere-tech`) and **Name**.
5.  **Important**: Remember this ID. You must verify the package uses it.

## Step 2: Create a Personal Access Token (PAT)
1.  Go to your [Azure DevOps Profile](https://dev.azure.com/).
2.  Top Right User Icon -> **User settings** -> **Personal access tokens**.
3.  **+ New Token**:
    *   **Name**: `VS Code Marketplace`
    *   **Organization**: "All accessible organizations"
    *   **Scopes**: Scroll down to **Marketplace** and select **Manage** (Or `Acquire` and `Publish`).
    *   **Expiration**: Set to 1 year.
4.  **Copy** the token. You won't see it again.

## Step 3: Update `package.json`
1.  Open `package.json` in this folder.
2.  Find `"publisher": "antigravity"`.
3.  Change `"antigravity"` to your **actual Publisher ID** from Step 1.
4.  (Optional) Rename `"name": "ai-initiative-scaffolder"` if you want a more unique URL (e.g., `veere-ai-scaffolder`).

## Step 4: Login & Publish
Open your terminal in this folder (`ai-initiative-scaffolder`) and run:

```powershell
# 1. Login (You will be prompted to paste your PAT)
npx vsce login <YOUR_PUBLISHER_ID>

# 2. Publish
npx vsce publish
```

## Step 5: Verification
*   The extension will go into "Verifying" state for a few minutes.
*   Once approved, it will be searchable in VS Code!
