import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/email/view/route'
import { google } from 'googleapis'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

vi.mock('googleapis', async () => {
    const fakeGet = vi.fn()
    return {
        google: {
            gmail: vi.fn().mockReturnValue({
                users: {
                    messages: {
                        get: fakeGet,
                    },
                },
            }),
            auth: {
                OAuth2: vi.fn().mockImplementation(() => ({
                    setCredentials: vi.fn(),
                })),
            },
        },
    }
})

vi.mock('next-auth', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        default: vi.fn(() => ({ handler: vi.fn() })), // or however you use NextAuth
        getServerSession: vi.fn().mockResolvedValue(null), // if used
    };
});

const mockEmailPayload = {
    payload: {
        headers: [
            { name: 'Subject', value: 'Test Subject' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'Date', value: '2025-08-06' },
        ],
        mimeType: 'multipart/alternative',
        parts: [
            {
                mimeType: 'text/plain',
                body: {
                    data: Buffer.from('This is the plain text').toString('base64url'),
                },
            },
            {
                mimeType: 'text/html',
                body: {
                    data: Buffer.from('<p>This is the HTML</p>').toString('base64url'),
                },
            },
        ],
    },
}

describe('GET /api/email/view', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns 401 if no accessToken', async () => {
        vi.mocked(getServerSession).mockResolvedValue(null)

        const req = {
            nextUrl: { searchParams: new URLSearchParams({ id: 'abc123' }) },
        } as any

        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(401)
        expect(json.error).toBe('Unauthorized')
    })

    it('returns 400 if no ID param', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ accessToken: 'token' } as any)

        const req = {
            nextUrl: { searchParams: new URLSearchParams() },
        } as any

        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('Missing ID')
    })

    it('returns parsed email content if successful', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ accessToken: 'token' } as any)
        const gmailMock = google.gmail().users.messages.get as unknown as ReturnType<typeof vi.fn>
        gmailMock.mockResolvedValue({ data: mockEmailPayload })

        const req = {
            nextUrl: { searchParams: new URLSearchParams({ id: 'abc123' }) },
        } as any

        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.subject).toBe('Test Subject')
        expect(json.from).toBe('sender@example.com')
        expect(json.date).toBe('2025-08-06')
        expect(json.bodyText).toBe('This is the plain text')
        expect(json.bodyHtml).toBe('<p>This is the HTML</p>')
    })

    it('returns 500 if Gmail API fails', async () => {
        vi.mocked(getServerSession).mockResolvedValue({ accessToken: 'token' } as any)
        const gmailMock = google.gmail().users.messages.get as unknown as ReturnType<typeof vi.fn>
        gmailMock.mockRejectedValue(new Error('API error'))

        const req = {
            nextUrl: { searchParams: new URLSearchParams({ id: 'abc123' }) },
        } as any

        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(500)
        expect(json.error).toBe('Failed to fetch email')
    })
})
