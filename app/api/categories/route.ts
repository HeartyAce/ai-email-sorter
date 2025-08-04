// app/api/categories/route.ts
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
    const filePath = path.join(process.cwd(), 'categories.json')
    try {
        const raw = await readFile(filePath, 'utf-8')
        const categories = JSON.parse(raw)
        return NextResponse.json({ categories })
    } catch (err) {
        return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
    }
}
