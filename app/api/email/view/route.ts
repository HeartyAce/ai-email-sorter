import { google } from 'googleapis'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

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

        const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject'
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown sender'
        const date = headers.find(h => h.name === 'Date')?.value || 'Unknown date'

        const { text, html } = extractEmailContent(message.data.payload)

        return NextResponse.json({
            subject,
            from,
            date,
            bodyText: text,
            bodyHtml: html,
        })
    } catch (e) {
        console.error('Failed to fetch email:', e)
        return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 })
    }
}

// Recursively extract plain text and HTML from payload
function extractEmailContent(payload: any): { text: string, html: string } {
    let text = ''
    let html = ''

    function walk(part: any) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
            // Gmail uses base64url encoding, not standard base64
            let data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
            while (data.length % 4) data += '=';
            text = Buffer.from(data, 'base64').toString('utf-8')
        } else if (part.mimeType === 'text/html' && part.body?.data) {
            let data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
            while (data.length % 4) data += '=';
            html = Buffer.from(data, 'base64').toString('utf-8')
        }

        if (Array.isArray(part.parts)) {
            part.parts.forEach(walk)
        }
    }

    walk(payload)
    return { text, html }
}
