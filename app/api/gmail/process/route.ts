import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { processEmails } from '@/lib/lib/gmail/processEmails'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)

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
    const session = await getServerSession(authOptions)

    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body: Record<string, unknown> = await req.json()
        const results = await processEmails(session.accessToken, body)
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