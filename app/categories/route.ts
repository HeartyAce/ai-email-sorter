// app/api/emails/[category]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'

export async function GET(req: NextRequest, { params }: { params: { category: string } }) {
    const category = params.category
    const dataPath = path.join(process.cwd(), 'emails.json') // Adjust to your actual file

    try {
        const raw = await readFile(dataPath, 'utf-8')
        const emails = JSON.parse(raw)

        const filtered = emails.filter((e: any) => e.category === category)
        return NextResponse.json({ emails: filtered })
    } catch (err) {
        return NextResponse.json({ error: 'Failed to load emails' }, { status: 500 })
    }
}
