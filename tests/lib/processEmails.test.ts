import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processEmails } from '@/lib/lib/gmail/processEmails'
import fs from 'fs'
import path from 'path'
import { google } from 'googleapis'
import { OpenAI } from 'openai'
import { saveEmails } from '@/lib/db'

// 👇 Mock getCategorization to fail (for fallback test)
vi.mock('@/lib/openai', () => ({
    getCategorization: vi.fn().mockRejectedValue(new Error('Mock failure')),
}))

// 👇 Mock fs.readFileSync & path.join
vi.mock('fs')
vi.mock('path', async () => {
    const actual = await vi.importActual<typeof import('path')>('path')
    return {
        ...actual,
        join: vi.fn(() => '/mocked/path/categories.json'),
    }
})

// 👇 Mock OpenAI chat completions
// 👇 Global OpenAI mock, modifiable per test
let shouldFail = false;

vi.mock('openai', () => ({
    OpenAI: vi.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: vi.fn().mockImplementation(() => {
                    if (shouldFail) {
                        throw new Error('OpenAI failure')
                    }
                    return Promise.resolve({
                        choices: [
                            {
                                message: {
                                    content: JSON.stringify({
                                        category: 'Promo',
                                        summary: 'Summary here',
                                    }),
                                },
                            },
                        ],
                    })
                }),
            },
        },
    })),
}))


// 👇 Mock Google Gmail API
vi.mock('googleapis', async () => ({
    google: {
        gmail: vi.fn().mockReturnValue({
            users: {
                messages: {
                    list: vi.fn().mockResolvedValue({
                        data: {
                            messages: [{ id: 'msg-123' }],
                        },
                    }),
                    get: vi.fn().mockResolvedValue({
                        data: {
                            id: 'msg-123',
                            payload: {
                                headers: [{ name: 'Subject', value: 'Test Subject' }],
                                body: {
                                    data: Buffer.from('This is a test email body').toString('base64'),
                                },
                            },
                        },
                    }),
                    modify: vi.fn().mockResolvedValue({}),
                },
            },
        }),
        auth: {
            OAuth2: vi.fn().mockImplementation(() => ({
                setCredentials: vi.fn(),
            })),
        },
    },
}))

// 👇 Mock db saveEmails
vi.mock('@/lib/db', () => ({
    saveEmails: vi.fn(),
}))

describe('processEmails()', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('processes Gmail messages and categorizes them', async () => {
        vi.mocked(fs.readFileSync).mockReturnValueOnce(
            JSON.stringify([{ name: 'Promo', description: 'Promotional messages' }])
        )

        const results = await processEmails('mock-access-token')

        expect(results).toHaveLength(1)
        expect(results[0]).toMatchObject({
            id: 'msg-123',
            subject: 'Test Subject',
            category: 'Promo',
            summary: 'Summary here',
        })

        expect(saveEmails).toHaveBeenCalledWith(results)
    })

    it('returns empty array if no messages are found', async () => {
        const mockGmail = google.gmail()
        vi.mocked(mockGmail.users.messages.list).mockResolvedValueOnce({ data: { messages: [] } })

        const results = await processEmails('mock-access-token')
        expect(results).toEqual([])
    })

    it('uses fallback category and summary on OpenAI failure', async () => {
        shouldFail = true;

        vi.mocked(fs.readFileSync).mockReturnValueOnce(
            JSON.stringify([{ name: 'Promo', description: 'Promotional messages' }])
        )

        const results = await processEmails('mock-access-token')

        expect(results[0].category).toBe('Uncategorized')
        expect(results[0].summary).toBe('AI categorization failed')

        shouldFail = false; // reset for other tests
    })


    it('logs and skips failed messages without throwing', async () => {
        const mockGmail = google.gmail()
        vi.mocked(fs.readFileSync).mockReturnValueOnce('[]')
        vi.mocked(mockGmail.users.messages.get).mockRejectedValueOnce(new Error('Message fetch failed'))

        const results = await processEmails('mock-access-token')
        expect(results).toEqual([])
    })

    it('handles missing categories.json gracefully', async () => {
        vi.mocked(fs.readFileSync).mockImplementation(() => {
            throw new Error('File not found')
        })

        const results = await processEmails('mock-access-token')

        // Should still work using OpenAI fallback (which returns 'Promo' in this case)
        expect(results.length).toBe(1)
        expect(results[0].category).toBe('Promo')
    })
})
