import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

type EmailEntry = {
    id: string;
    subject: string;
    summary: string;
    category: string;
};

export function saveEmails(emails: EmailEntry[]) {
    const existing = getEmails();
    const newOnes = emails.filter((e) => !existing.find((x) => x.id === e.id));
    const all = [...existing, ...newOnes];
    writeFileSync(DB_PATH, JSON.stringify(all, null, 2));
}

export function getEmails(): EmailEntry[] {
    if (!existsSync(DB_PATH)) return [];
    const raw = readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
}

export function getEmailsByCategory(category: string): EmailEntry[] {
    return getEmails().filter((e) => e.category === category);
}
