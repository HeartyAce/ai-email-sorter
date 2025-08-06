import { google } from 'googleapis'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'

interface ExtendedSession extends Session {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions) as ExtendedSession

    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ids } = await req.json()

    if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'Missing or invalid "ids"' }, { status: 400 })
    }

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: session.accessToken })
    const gmail = google.gmail({ version: 'v1', auth })

    try {
        const results = await Promise.allSettled(
            ids.map((id: string) =>
                gmail.users.messages.trash({
                    userId: 'me',
                    id,
                })
            )
        )

        const success = results.filter(r => r.status === 'fulfilled').length
        const failed = results.length - success

        return NextResponse.json({ success, failed, message: 'Emails moved to trash.' })
    } catch (error) {
        console.error('Email trash failed:', error)
        return NextResponse.json({ error: 'Failed to move emails to trash' }, { status: 500 })
    }
}
