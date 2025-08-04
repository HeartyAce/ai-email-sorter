import { fetchSummarizedEmails } from '@/lib/gmail'
import { describe, it, expect, vi } from 'vitest'

// Mock google.gmail
vi.mock('googleapis', () => ({
    google: {
        gmail: vi.fn().mockReturnValue({
            users: {
                messages: {
                    list: vi.fn().mockResolvedValue({ data: { messages: [{ id: '1' }] } }),
                    get: vi.fn().mockResolvedValue({
                        data: {
                            payload: {
                                headers: [{ name: 'Subject', value: 'Mocked' }],
                                body: { data: Buffer.from('Body').toString('base64') },
                            },
                        },
                    }),
                },
            },
        }),
    },
}))

describe('fetchSummarizedEmails', () => {
    it('returns mocked emails', async () => {
        const mockAuth = {} as any
        const result = await fetchSummarizedEmails(mockAuth)
        expect(result).toBeTruthy()
        expect(Array.isArray(result)).toBe(true)
        expect(result[0]).toHaveProperty('subject', 'Mocked')
    })
})
