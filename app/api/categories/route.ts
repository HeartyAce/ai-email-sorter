// app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const dataPath = path.resolve(process.cwd(), 'categories.json')

export async function GET(req: NextRequest) {
    try {
        const file = fs.readFileSync(dataPath, 'utf8')
        const categories = JSON.parse(file)
        return NextResponse.json({ categories })
    } catch (err) {
        console.error('❌ Failed to load categories:', err)
        return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
    }
}
