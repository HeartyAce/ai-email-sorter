import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { saveEmails } from '@/lib/db';

const OLLAMA_API_URL = 'http://localhost:11434/api/generate';

export type Category = {
    name: string;
    description: string;
};

export type EmailResult = {
    id: string;
    subject: string;
    category: string;
    summary: string;
};

// Use fetch in both Node and browser environments
let fetchFn: typeof fetch;
try {
    fetchFn = fetch;
} catch {
    fetchFn = require('node-fetch');
}

export async function processEmails(accessToken: string): Promise<EmailResult[]> {
    console.log("🛂 Using access token:", accessToken.slice(0, 10), "...")

    const oAuth2Client = new google.auth.OAuth2()
    oAuth2Client.setCredentials({ access_token: accessToken })

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

    // Optional: Validate token by trying to get Gmail profile
    try {
        const profile = await gmail.users.getProfile({ userId: 'me' })
        console.log("✅ Authenticated Gmail user:", profile.data.emailAddress)
    } catch (e: any) {
        console.error("❌ Gmail auth failed:", e.response?.data || e.message)
        throw new Error("Invalid Gmail credentials")
    }

    let messages = []
    try {
        const { data } = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 5,
        })
        messages = data.messages || []
        console.log(`📥 Found ${messages.length} messages`)
    } catch (err: any) {
        console.error("❌ Gmail message listing failed:", err.response?.data || err.message)
        throw new Error("Gmail message listing failed")
    }
    const results: EmailResult[] = [];
    const model = process.env.OLLAMA_MODEL || 'mistral';

    for (const msg of messages) {
        try {
            const full = await gmail.users.messages.get({ userId: 'me', id: msg.id! });
            const subject =
                full.data.payload?.headers?.find((h) => h.name === 'Subject')?.value || 'No Subject';
            const body = getPlainTextFromPayload(full.data.payload);
            const trimmedBody = body.slice(0, 2000);

            const prompt = buildPrompt(subject, trimmedBody, categories);

            let category = 'Uncategorized';
            let summary = '';
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000);

            try {
                const ollamaRes = await fetchFn(OLLAMA_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model, prompt, stream: false }),
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                const result = await ollamaRes.json();
                const parsed = JSON.parse(result.response || '{}');
                category = parsed.category || 'Uncategorized';
                summary = parsed.summary || '';
            } catch (err) {
                console.error('🧠 Ollama call failed:', err);
                summary = 'Ollama timed out or failed';
            }

            try {
                await gmail.users.messages.modify({
                    userId: 'me',
                    id: msg.id!,
                    requestBody: {
                        removeLabelIds: ['INBOX'],
                    },
                });
            } catch (modErr) {
                console.warn(`⚠️ Failed to archive message ${msg.id}:`, modErr);
            }

            results.push({
                id: msg.id!,
                subject,
                category,
                summary,
            });
        } catch (err) {
            console.error(`⛔ Failed to process message ${msg.id}:`, err);
        }
    }

    try {
        saveEmails(results);
    } catch (dbErr) {
        console.error('💾 Failed to save emails locally:', dbErr);
    }

    return results;
}

// Helper to extract text from Gmail payload
function getPlainTextFromPayload(payload: any): string {
    if (!payload) return '';
    if (payload.body?.data) {
        let data = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
        while (data.length % 4) data += '=';
        return Buffer.from(data, 'base64').toString('utf-8');
    }
    if (payload.parts && Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
            const text = getPlainTextFromPayload(part);
            if (text) return text;
        }
    }
    return '';
}

// AI prompt builder
function buildPrompt(subject: string, body: string, categories: Category[]): string {
    const list = categories
        .map((cat, idx) => `(${idx + 1}) ${cat.name}: ${cat.description}`)
        .join('\n');

    return `
You are an AI email assistant. Assign the best category and give a 1-2 sentence summary.

Categories:
${list}

Email:
Subject: ${subject}

${body}

Respond with JSON:
{ "category": string, "summary": string }
`.trim();
}
