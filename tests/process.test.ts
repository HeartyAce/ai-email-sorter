import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/gmail/process/route'
import { processEmails } from '@/lib/lib/gmail/processEmails'
import { getServerSession } from 'next-auth'
import { type NextRequest } from 'next/server'


vi.mock('@/lib/lib/gmail/processEmails', () => ({
    processEmails: vi.fn(),
}))

const mockSession = { accessToken: 'mock-token' }

vi.mock('next-auth', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        default: vi.fn(() => ({ handler: vi.fn() })), // or however you use NextAuth
        getServerSession: vi.fn().mockResolvedValue(null), // if used
    };
});

describe('/api/gmail/process', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('GET', () => {
        it('returns 401 if no session', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce(null)

            const req = {} as NextRequest
            const res = await GET(req)

            expect(res.status).toBe(401)
            const json = await res.json()
            expect(json.error).toMatch(/unauthorized/i)
        })

        it('returns 200 with results if session is valid', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce(mockSession)
            vi.mocked(processEmails).mockResolvedValueOnce([
                { id: '1', subject: 'Test', category: 'Promo', summary: 'Summary' },
            ])

            const req = {} as NextRequest
            const res = await GET(req)

            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.results[0].subject).toBe('Test')
        })

        it('returns 500 if processEmails throws', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce(mockSession)
            vi.mocked(processEmails).mockImplementation(() => {
                throw new Error('Failure')
            })

            const req = {} as NextRequest
            const res = await GET(req)

            expect(res.status).toBe(500)
            const json = await res.json()
            expect(json.error).toMatch(/failed to process/i)
        })
    })

    describe('POST', () => {
        it('returns 401 if session is missing', async () => {
            vi.mocked(getServerSession).mockResolvedValueOnce(null)

            const req = {} as NextRequest
            const res = await POST(req)

            expect(res.status).toBe(401)
        })

        it('returns 200 with results from POST', async () => {
            const mockBody = { category: 'Inbox' }
            const req = {
                json: vi.fn().mockResolvedValueOnce(mockBody),
            } as unknown as NextRequest

            vi.mocked(getServerSession).mockResolvedValueOnce(mockSession)
            vi.mocked(processEmails).mockResolvedValueOnce([
                { id: '2', subject: 'Hello', category: 'Inbox', summary: 'Summary' },
            ])

            const res = await POST(req)
            expect(res.status).toBe(200)
            const json = await res.json()
            expect(json.results[0].id).toBe('2')
        })

        it('returns 500 if POST fails', async () => {
            const req = {
                json: vi.fn().mockResolvedValueOnce({}),
            } as unknown as NextRequest

            vi.mocked(getServerSession).mockResolvedValueOnce(mockSession)
            vi.mocked(processEmails).mockImplementation(() => {
                throw new Error('Crash')
            })

            const res = await POST(req)
            expect(res.status).toBe(500)
            const json = await res.json()
            expect(json.error).toMatch(/failed to process/i)
        })
    })
})
