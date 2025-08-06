import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const dataPath = path.resolve(process.cwd(), 'emails.json')

type Email = {
    id: string
    subject: string
    summary?: string
    body?: string
    bodyText?: string
    bodyHtml?: string
    from?: string
    date?: string
    category: string
}

type Category = {
    id: string
    name: string
    description: string
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const category = searchParams.get('name')

        if (!category) {
            return NextResponse.json({ error: 'Missing category name' }, { status: 400 })
        }

        const file = fs.readFileSync(dataPath, 'utf8')
        const parsed: { emails: Email[] } = JSON.parse(file)

        const emails = parsed.emails || []
        const filtered = emails.filter((email: Email) => email.category === category)

        return NextResponse.json({ emails: filtered })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Failed to load emails' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body: { name?: string; description?: string } = await req.json()

        if (!body.name || !body.description) {
            return NextResponse.json({ error: 'Missing name or description' }, { status: 400 })
        }

        let categories: Category[] = []

        // Ensure file exists and is structured correctly
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, JSON.stringify({ emails: [], categories: [] }, null, 2))
        }

        const file = fs.readFileSync(dataPath, 'utf8')
        const parsed = JSON.parse(file)

        if (!Array.isArray(parsed.categories)) {
            parsed.categories = []
        }

        categories = parsed.categories

        if (categories.some((cat) => cat.name === body.name)) {
            return NextResponse.json({ error: 'Category already exists' }, { status: 400 })
        }

        const newCategory: Category = {
            id: Date.now().toString(),
            name: body.name,
            description: body.description,
        }

        categories.push(newCategory)

        // Reassign and save
        const updatedData = {
            ...parsed,
            categories,
        }

        fs.writeFileSync(dataPath, JSON.stringify(updatedData, null, 2))

        return NextResponse.json({ success: true, category: newCategory })
    } catch (err) {
        console.error('❌ Failed to add category:', err)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
