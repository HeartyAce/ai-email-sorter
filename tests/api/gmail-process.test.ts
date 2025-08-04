// tests/api/gmail-process.test.ts
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/gmail/process/route'
import { NextRequest } from 'next/server'

vi.mock('googleapis', () => ({
    google: {
        auth: { OAuth2: vi.fn().mockImplementation(() => ({ setCredentials: vi.fn() })) },
        gmail: vi.fn().mockReturnValue({
            users: {
                messages: {
                    list: vi.fn().mockResolvedValue({ data: { messages: [{ id: '1' }] } }),
                    get: vi.fn().mockResolvedValue({
                        data: {
                            payload: {
                                headers: [{ name: 'Subject', value: 'Test Email' }],
                                body: { data: Buffer.from('Hello', 'utf-8').toString('base64') },
                            },
                        },
                    }),
                    modify: vi.fn().mockResolvedValue({}),
                },
            },
        }),
    },
}))

describe('GET /api/gmail/process', () => {
    it('should return email summaries', async () => {
        const req = new NextRequest('http://localhost')
        const res = await GET(req)
        const json = await res.json()
        expect(json.results).toBeDefined()
    })
})
