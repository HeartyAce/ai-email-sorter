import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { google } from 'googleapis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

interface ExtendedSession extends Session {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions) as ExtendedSession

    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
        return NextResponse.json({ error: 'Missing ID' }, { status: 400 })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.accessToken })
    const gmail = google.gmail({ version: 'v1', auth })

    try {
        const message = await gmail.users.messages.get({ userId: 'me', id })

        const headers = message.data.payload?.headers || []

        const subject = headers.find((h) => h.name === 'Subject')?.value || 'No subject'
        const from = headers.find((h) => h.name === 'From')?.value || 'Unknown sender'
        const date = headers.find((h) => h.name === 'Date')?.value || 'Unknown date'

        const { text, html } = extractEmailContent(message.data.payload)

        return NextResponse.json({
            subject,
            from,
            date,
            bodyText: text,
            bodyHtml: html,
        })
    } catch (e) {
        console.error('❌ Failed to fetch email:', e)
        return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 })
    }
}

interface GmailPayload {
    mimeType?: string | null
    body?: { data?: string | null }
    parts?: GmailPayload[]
}


// Recursively extract plain text and HTML from payload
function extractEmailContent(payload?: GmailPayload): { text: string; html: string } {
    let text = ''
    let html = ''

    function walk(part: GmailPayload) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
            const decoded = decodeBase64Url(part.body.data)
            text = decoded
        } else if (part.mimeType === 'text/html' && part.body?.data) {
            const decoded = decodeBase64Url(part.body.data)
            html = decoded
        }

        if (Array.isArray(part.parts)) {
            part.parts.forEach(walk)
        }
    }

    if (payload) {
        walk(payload)
    }

    return { text, html }
}

function decodeBase64Url(base64url: string): string {
    let data = base64url.replace(/-/g, '+').replace(/_/g, '/')
    while (data.length % 4 !== 0) {
        data += '='
    }
    return Buffer.from(data, 'base64').toString('utf-8')
}
