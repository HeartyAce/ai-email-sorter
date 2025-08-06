import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/email/route'
import * as fs from 'fs'

vi.mock('fs')

const mockEmails = [
    { id: '123', subject: 'Hello World', body: 'This is the body' },
    { id: '456', subject: 'Another Email', body: 'Another body' },
]

function createRequestWithURL(url: string): Request {
    return { url, method: 'GET' } as unknown as Request
}

describe('GET /api/email', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns 400 if no id param', async () => {
        const req = createRequestWithURL('http://localhost/api/email')
        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(400)
        expect(json.error).toBe('Missing id param')
    })

    it('returns 404 if email not found', async () => {
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ emails: mockEmails }))

        const req = createRequestWithURL('http://localhost/api/email?id=999')
        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(404)
        expect(json.error).toBe('Email not found')
    })

    it('returns email data if id matches', async () => {
        vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ emails: mockEmails }))

        const req = createRequestWithURL('http://localhost/api/email?id=123')
        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.subject).toBe('Hello World')
        expect(json.bodyText).toBe('This is the body')
        expect(json.bodyHtml).toBe('<p>This is the body</p>')
        expect(json.from).toBe('example@example.com')
    })

    it('returns 500 if file read fails', async () => {
        vi.mocked(fs.readFileSync).mockImplementation(() => {
            throw new Error('fs read error')
        })

        const req = createRequestWithURL('http://localhost/api/email?id=123')
        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(500)
        expect(json.error).toBe('Internal Server Error')
    })
})