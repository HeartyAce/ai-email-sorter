// /app/api/emails/category/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataPath = path.resolve(process.cwd(), 'categories.json');

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
