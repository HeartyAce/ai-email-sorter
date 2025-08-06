import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const dataPath = path.resolve(process.cwd(), 'emails.json')

type Email = {
    id: string
    subject: string
    body: string
    // Optionally include others if present in your data
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'Missing id param' }, { status: 400 })
        }

        const file = fs.readFileSync(dataPath, 'utf8')
        const parsed: { emails: Email[] } = JSON.parse(file)
        const emails: Email[] = parsed.emails || []

        const email = emails.find((e) => e.id === id)

        if (!email) {
            return NextResponse.json({ error: 'Email not found' }, { status: 404 })
        }

        return NextResponse.json({
            subject: email.subject,
            from: 'example@example.com', // mock sender
            date: '2025-08-06',          // mock date
            bodyText: email.body,
            bodyHtml: `<p>${email.body}</p>`,
        })
    } catch (err) {
        console.error('Error loading email:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
