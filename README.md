# Recipe Vault

A sleek recipe manager that extracts clean recipes from any webpage using Claude AI, stores them in Firebase, and deploys to GitHub Pages.

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/recipe-vault.git
cd recipe-vault
npm install
```

### 2. Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Add a **Web app** to the project
4. Enable **Firestore Database** (start in test mode)
5. Copy the Firebase config object — you'll paste it into Settings in the app

**Recommended Firestore rules** (for personal use):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

For production use, add Firebase Authentication and restrict rules to authenticated users.

### 3. Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. Paste it into Settings in the app

### 4. Run Locally

```bash
npm run dev
```

The app opens at `http://localhost:5173`. On first run, a Settings modal will appear — paste your Firebase config JSON and Anthropic API key.

### 5. Deploy to GitHub Pages

1. Push your repo to GitHub
2. Go to **Settings → Pages** → set Source to **GitHub Actions**
3. Push to `main` — the workflow in `.github/workflows/deploy.yml` will build and deploy automatically

**Note on base URL**: If deploying as a project page (e.g. `username.github.io/recipe-vault`), update `vite.config.js`:
```js
base: '/recipe-vault/', // match your repo name
```

## Usage

- Click **Add Recipe** and paste any recipe URL
- Claude fetches and extracts the recipe, stripping all ads and fluff
- Edit tags before saving
- Organize into custom collections
- Filter by tag from the sidebar
- Favorite recipes for quick access

## Tech Stack

- React + Vite
- Firebase Firestore
- Claude AI (claude-sonnet-4-20250514)
- GitHub Actions + GitHub Pages
