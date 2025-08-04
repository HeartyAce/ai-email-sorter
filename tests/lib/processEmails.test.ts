import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processEmails } from '@/lib/lib/gmail/processEmails';

vi.mock('fs', () => ({
    readFileSync: vi.fn(() =>
        JSON.stringify([
            { name: 'Promo', description: 'Promotional emails' },
            { name: 'Work', description: 'Work-related emails' },
        ])
    ),
}));

vi.mock('googleapis', () => {
    const mockList = vi.fn(() =>
        Promise.resolve({
            data: {
                messages: [{ id: 'msg1' }, { id: 'msg2' }],
            },
        })
    );

    const mockGet = vi.fn((params) =>
        Promise.resolve({
            data: {
                payload: {
                    headers: [{ name: 'Subject', value: 'Test Email' }],
                    body: { data: Buffer.from('This is the body').toString('base64') },
                },
            },
        })
    );

    const mockModify = vi.fn(() => Promise.resolve());

    return {
        google: {
            gmail: () => ({
                users: {
                    messages: {
                        list: mockList,
                        get: mockGet,
                        modify: mockModify,
                    },
                },
            }),
            auth: {
                OAuth2: class {
                    setCredentials() { }
                },
            },
        },
    };
});

// Mock saveEmails to avoid actual DB writes
vi.mock('@/lib/db', () => ({
    saveEmails: vi.fn(() => Promise.resolve()),
}));

global.fetch = vi.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve({ response: JSON.stringify({ category: 'Promo', summary: 'Short summary' }) }),
    })
) as any;

describe('processEmails', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    it('returns processed email results', async () => {
        const results = await processEmails('fake-access-token');

        expect(results.length).toBe(2);
        expect(results[0]).toEqual({
            id: 'msg1',
            subject: 'Test Email',
            category: 'Promo',
            summary: 'Short summary',
        });
    });

    it('handles Gmail authentication failure', async () => {
        // Patch googleapis mock to throw on getProfile
        const { google } = await import('googleapis');
        google.gmail = () => ({
            users: {
                getProfile: () => { throw { response: { data: 'Auth error' } }; },
                messages: {
                    list: vi.fn(),
                    get: vi.fn(),
                    modify: vi.fn(),
                },
            },
        });
        await expect(processEmails('bad-token')).rejects.toThrow('Invalid Gmail credentials');
    });

    it('handles Gmail message listing failure', async () => {
        // Patch googleapis mock to throw on messages.list
        const { google } = await import('googleapis');
        google.gmail = () => ({
            users: {
                getProfile: vi.fn(() => Promise.resolve({ data: { emailAddress: 'test@example.com' } })),
                messages: {
                    list: vi.fn(() => { throw { response: { data: 'List error' } }; }),
                    get: vi.fn(),
                    modify: vi.fn(),
                },
            },
        });
        await expect(processEmails('token')).rejects.toThrow('Gmail message listing failed');
    });

    it('handles Ollama call failure gracefully', async () => {
        (global.fetch as any).mockImplementationOnce(() => Promise.reject(new Error('Ollama down')));
        const results = await processEmails('fake-access-token');
        expect(results[0].summary).toBe('Ollama timed out or failed');
        expect(results[0].category).toBe('Uncategorized');
    });

    it('archives messages after processing', async () => {
        const { google } = await import('googleapis');
        const modify = vi.fn(() => Promise.resolve());
        google.gmail = () => ({
            users: {
                getProfile: vi.fn(() => Promise.resolve({ data: { emailAddress: 'test@example.com' } })),
                messages: {
                    list: vi.fn(() => Promise.resolve({ data: { messages: [{ id: 'msg1' }] } })),
                    get: vi.fn(() =>
                        Promise.resolve({
                            data: {
                                payload: {
                                    headers: [{ name: 'Subject', value: 'Test Email' }],
                                    body: { data: Buffer.from('Body').toString('base64') },
                                },
                            },
                        })
                    ),
                    modify,
                },
            },
        });
        await processEmails('fake-access-token');
        expect(modify).toHaveBeenCalledWith({
            userId: 'me',
            id: 'msg1',
            requestBody: { removeLabelIds: ['INBOX'] },
        });
    });

    it('calls saveEmails with results', async () => {
        const { saveEmails } = await import('@/lib/db');
        await processEmails('fake-access-token');
        expect(saveEmails).toHaveBeenCalled();
    });
});
