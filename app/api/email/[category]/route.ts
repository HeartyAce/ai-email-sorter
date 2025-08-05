// /app/api/email/category/route.ts
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const dataPath = path.resolve(process.cwd(), 'emails.json')

// ✅ Add this GET handler
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const category = searchParams.get('name')

        if (!category) {
            return NextResponse.json({ error: 'Missing category name' }, { status: 400 })
        }

        const file = fs.readFileSync(dataPath, 'utf8')
        const parsed = JSON.parse(file)

        const emails = parsed.emails || []
        const filtered = emails.filter(
            (email: any) => email.category === category
        )

        return NextResponse.json({ emails: filtered })
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Failed to load emails' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (!body.name || !body.description) {
            return NextResponse.json({ error: 'Missing name or description' }, { status: 400 });
        }

        // Ensure file exists
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, '[]');
        }

        // Read categories
        const file = fs.readFileSync(dataPath, 'utf8');
        let categories = JSON.parse(file);

        // Avoid duplicates
        if (categories.some((cat: any) => cat.name === body.name)) {
            return NextResponse.json({ error: 'Category already exists' }, { status: 400 });
        }

        // Add and save
        const newCategory = {
            id: Date.now().toString(),
            name: body.name,
            description: body.description,
        };

        categories.push(newCategory);
        fs.writeFileSync(dataPath, JSON.stringify(categories, null, 2));

        return NextResponse.json({ success: true, category: newCategory });
    } catch (err) {
        console.error('❌ Failed to add category:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
