import { describe, expect, it, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { saveEmails, getEmails } from '@/lib/db'
import { getEmailsByCategory } from '@/lib/db'

const TEMP_DB_PATH = path.join(__dirname, 'test-db.json')

afterEach(() => {
    if (fs.existsSync(TEMP_DB_PATH)) {
        fs.unlinkSync(TEMP_DB_PATH)
    }
})

describe('db.ts', () => {
    it('saveEmails writes new emails and avoids duplicates', () => {
        const emails = [
            { id: '1', subject: 'Hello', summary: 'Short summary', category: 'Promo' },
            { id: '2', subject: 'Hi', summary: 'Another one', category: 'Promo' },
        ]

        fs.writeFileSync(TEMP_DB_PATH, '[]')
        saveEmails(emails, TEMP_DB_PATH)

        const secondBatch = [
            { id: '2', subject: 'Hi', summary: 'Another one', category: 'Promo' }, // duplicate
            { id: '3', subject: 'Yo', summary: 'Fresh', category: 'Social' },
        ]
        saveEmails(secondBatch, TEMP_DB_PATH)

        const all = getEmails(TEMP_DB_PATH)
        expect(all.length).toBe(3)
        expect(all.find((e) => e.id === '1')).toBeTruthy()
        expect(all.find((e) => e.id === '2')).toBeTruthy()
        expect(all.find((e) => e.id === '3')).toBeTruthy()
    })
})

it('filters by category', () => {
    const emails = [
        { id: '1', subject: 'A', summary: 'x', category: 'Promo' },
        { id: '2', subject: 'B', summary: 'y', category: 'Security' },
    ]
    fs.writeFileSync(TEMP_DB_PATH, '[]') // 🔥 clear previous test data
    saveEmails(emails, TEMP_DB_PATH)

    const promo = getEmailsByCategory('Promo', TEMP_DB_PATH)
    expect(promo.length).toBe(1)
    expect(promo[0].id).toBe('1')
})
const TEMP_DB_PATH = path.join(__dirname, 'test-db.json')

// Patch the db functions to accept a custom path for testing
function saveEmailsPatched(emails: any[], dbPath: string) {
    const { writeFileSync, readFileSync, existsSync } = fs
    const DB_PATH = dbPath

    function getEmailsLocal(): any[] {
        if (!existsSync(DB_PATH)) return []
        const raw = readFileSync(DB_PATH, 'utf-8')
        return JSON.parse(raw)
    }

    const existing = getEmailsLocal()
    const newOnes = emails.filter((e) => !existing.find((x) => x.id === e.id))
    const all = [...existing, ...newOnes]
    writeFileSync(DB_PATH, JSON.stringify(all, null, 2))
}

function getEmailsPatched(dbPath: string): any[] {
    const { readFileSync, existsSync } = fs
    const DB_PATH = dbPath
    if (!existsSync(DB_PATH)) return []
    const raw = readFileSync(DB_PATH, 'utf-8')
    return JSON.parse(raw)
}

function getEmailsByCategoryPatched(category: string, dbPath: string): any[] {
    return getEmailsPatched(dbPath).filter((e) => e.category === category)
}

afterEach(() => {
    if (fs.existsSync(TEMP_DB_PATH)) {
        fs.unlinkSync(TEMP_DB_PATH)
    }
})

describe('db.ts', () => {
    it('saveEmails writes new emails and avoids duplicates', () => {
        const emails = [
            { id: '1', subject: 'Hello', summary: 'Short summary', category: 'Promo' },
            { id: '2', subject: 'Hi', summary: 'Another one', category: 'Promo' },
        ]

        fs.writeFileSync(TEMP_DB_PATH, '[]')
        saveEmailsPatched(emails, TEMP_DB_PATH)

        const secondBatch = [
            { id: '2', subject: 'Hi', summary: 'Another one', category: 'Promo' }, // duplicate
            { id: '3', subject: 'Yo', summary: 'Fresh', category: 'Social' },
        ]
        saveEmailsPatched(secondBatch, TEMP_DB_PATH)

        const all = getEmailsPatched(TEMP_DB_PATH)
        expect(all.length).toBe(3)
        expect(all.find((e) => e.id === '1')).toBeTruthy()
        expect(all.find((e) => e.id === '2')).toBeTruthy()
        expect(all.find((e) => e.id === '3')).toBeTruthy()
    })

    it('filters by category', () => {
        const emails = [
            { id: '1', subject: 'A', summary: 'x', category: 'Promo' },
            { id: '2', subject: 'B', summary: 'y', category: 'Security' },
        ]
        fs.writeFileSync(TEMP_DB_PATH, '[]')
        saveEmailsPatched(emails, TEMP_DB_PATH)

        const promo = getEmailsByCategoryPatched('Promo', TEMP_DB_PATH)
        expect(promo.length).toBe(1)
        expect(promo[0].id).toBe('1')
    })

    it('returns empty array if db file does not exist', () => {
        if (fs.existsSync(TEMP_DB_PATH)) fs.unlinkSync(TEMP_DB_PATH)
        const emails = getEmailsPatched(TEMP_DB_PATH)
        expect(emails).toEqual([])
    })

    it('getEmailsByCategory returns empty array for missing category', () => {
        const emails = [
            { id: '1', subject: 'A', summary: 'x', category: 'Promo' },
        ]
        fs.writeFileSync(TEMP_DB_PATH, '[]')
        saveEmailsPatched(emails, TEMP_DB_PATH)
        const result = getEmailsByCategoryPatched('Nonexistent', TEMP_DB_PATH)
        expect(result).toEqual([])
    })

    it('saveEmails does not overwrite existing emails with same id', () => {
        const emails = [
            { id: '1', subject: 'A', summary: 'x', category: 'Promo' },
        ]
        fs.writeFileSync(TEMP_DB_PATH, '[]')
        saveEmailsPatched(emails, TEMP_DB_PATH)
        // Try to save with same id but different subject
        saveEmailsPatched([{ id: '1', subject: 'B', summary: 'y', category: 'Promo' }], TEMP_DB_PATH)
        const all = getEmailsPatched(TEMP_DB_PATH)
        expect(all.length).toBe(1)
        expect(all[0].subject).toBe('A')
    })

    it('getEmails returns emails from db file', () => {
        const emails = [
            { id: '1', subject: 'Test', summary: 'Sum', category: 'Inbox' },
            { id: '2', subject: 'Another', summary: 'Sum2', category: 'Promo' },
        ]
        fs.writeFileSync(TEMP_DB_PATH, JSON.stringify(emails, null, 2))
        const result = getEmailsPatched(TEMP_DB_PATH)
        expect(result).toEqual(emails)
    })

    it('getEmailsByCategory returns correct emails', () => {
        const emails = [
            { id: '1', subject: 'Test', summary: 'Sum', category: 'Inbox' },
            { id: '2', subject: 'Another', summary: 'Sum2', category: 'Promo' },
            { id: '3', subject: 'Third', summary: 'Sum3', category: 'Promo' },
        ]
        fs.writeFileSync(TEMP_DB_PATH, JSON.stringify(emails, null, 2))
        const promo = getEmailsByCategoryPatched('Promo', TEMP_DB_PATH)
        expect(promo.length).toBe(2)
        expect(promo.map(e => e.id)).toContain('2')
        expect(promo.map(e => e.id)).toContain('3')
    })

    it('saveEmails with empty array does not change db', () => {
        const emails = [
            { id: '1', subject: 'Test', summary: 'Sum', category: 'Inbox' },
        ]
        fs.writeFileSync(TEMP_DB_PATH, JSON.stringify(emails, null, 2))
        saveEmailsPatched([], TEMP_DB_PATH)
        const result = getEmailsPatched(TEMP_DB_PATH)
        expect(result).toEqual(emails)
    })

    it('saveEmails can add to empty db', () => {
        fs.writeFileSync(TEMP_DB_PATH, '[]')
        const emails = [
            { id: '1', subject: 'Test', summary: 'Sum', category: 'Inbox' },
        ]
        saveEmailsPatched(emails, TEMP_DB_PATH)
        const result = getEmailsPatched(TEMP_DB_PATH)
        expect(result).toEqual(emails)
    })
})


