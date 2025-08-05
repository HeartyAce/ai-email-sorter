import { google } from 'googleapis';
import { readFileSync } from 'fs';
import path from 'path';
import { saveEmails } from '@/lib/db';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

export async function processEmails(accessToken: string): Promise<EmailResult[]> {
    console.log('🛂 Using access token:', accessToken.slice(0, 20), '...');
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    const categoryPath = path.join(process.cwd(), 'categories.json');
    let categories: Category[] = [];

    try {
        const raw = readFileSync(categoryPath, 'utf-8');
        categories = JSON.parse(raw);
    } catch {
        console.warn('⚠ No valid categories.json found.');
    }

    const { data } = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 10,
    });

    const messages = data.messages || [];
    console.log(`📥 Found ${messages.length} messages`);
    if (messages.length === 0) return [];

    const results: EmailResult[] = [];

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

            try {
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4.1',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                });

                const content = completion.choices[0]?.message?.content || '{}';
                const parsed = JSON.parse(content);
                category = parsed.category || 'Uncategorized';
                summary = parsed.summary || '';
            } catch (err) {
                console.error('❌ OpenAI failed:', err);
                summary = 'AI categorization failed';
            }

            // Archive email (remove from INBOX)
            await gmail.users.messages.modify({
                userId: 'me',
                id: msg.id!,
                requestBody: {
                    removeLabelIds: ['INBOX'],
                },
            });

            results.push({ id: msg.id!, subject, category, summary });
        } catch (err) {
            console.error(`⛔ Failed to process message ${msg.id}:`, err);
        }
    }

    await saveEmails(results);
    return results;
}

// Helpers

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
