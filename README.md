# AI Email Sorter

This is my submission for the AI email sorting challenge.

## ✨ Features

- Google OAuth login
- Category creation (with descriptions)
- AI sorting of emails using category descriptions
- AI summaries of each email (via Ollama locally)
- Gmail archiving after import
- Bulk actions: delete and unsubscribe (agent stubbed for safety)

## 🛠️ Local Setup

### Requirements

- Node.js (v18+)
- Ollama installed and running locally
- Gmail OAuth credentials (dev mode)
- `.env.local` file

### Setup

```bash
git clone https://github.com/HeartyAce/ai-email-sorter.git
cd ai-email-sorter
npm install
Create a .env.local file with:

env
Copy
Edit
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
Start Ollama and load a model (e.g., Mistral):

bash
Copy
Edit
ollama run mistral
Start the dev server:

bash
Copy
Edit
npm run dev
Visit http://localhost:3000 in your browser.