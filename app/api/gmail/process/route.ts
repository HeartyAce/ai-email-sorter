import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { processEmails } from '@/lib/lib/gmail/processEmails'
import type { Session } from 'next-auth'

interface ExtendedSession extends Session {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions) as ExtendedSession

    if (!session?.accessToken) {
        console.error('❌ No valid session or accessToken')
        return NextResponse.json(
            { error: 'Unauthorized - no token found' },
            { status: 401 }
        )
    }

    try {
        const results = await processEmails(session.accessToken)
        return NextResponse.json({ results })
    } catch (err) {
        const error = err as Error
        console.error('❌ Email processing failed:', error.message)
        return NextResponse.json(
            { error: 'Failed to process Gmail', details: error.message },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions) as ExtendedSession

    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body: Record<string, unknown> = await req.json()
        const results = await processEmails(session.accessToken)
        return NextResponse.json({ results })
    } catch (err) {
        const error = err as Error
        console.error('❌ Email processing failed:', error)
        return NextResponse.json(
            { error: 'Failed to process Gmail', details: error.message },
            { status: 500 }
        )
    }
}
