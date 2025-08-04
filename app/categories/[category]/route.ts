import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const dataPath = path.resolve(process.cwd(), 'emails.json')

export async function GET(
    req: NextRequest,
    { params }: { params: { category: string } }
) {
    try {
        const category = decodeURIComponent(params.category)
        const file = fs.readFileSync(dataPath, 'utf8')
        const parsed = JSON.parse(file)

        const emails = parsed.emails || [] // Fix: access the 'emails' key in the object

        const filtered = emails.filter(
            (email: any) => email.category === category
        )

        return NextResponse.json({ emails: filtered })
    } catch (err) {
        console.error(err)
        return NextResponse.json(
            { error: 'Failed to load emails' },
            { status: 500 }
        )
    }
}
