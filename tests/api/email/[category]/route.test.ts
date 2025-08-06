// tests/app/api/email/[category]/route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import { GET, POST } from '@/app/api/email/[category]/route';
import { NextRequest } from 'next/server';
import path from 'path';

const dataPath = path.resolve(process.cwd(), 'emails.json');

// Fix: custom NextRequest mock supporting .json()
function createNextRequest(url: string, method: 'GET' | 'POST', body?: any): NextRequest {
    return {
        method,
        url,
        headers: new Headers({ 'Content-Type': 'application/json' }),
        json: async () => body,
    } as unknown as NextRequest;
}

beforeEach(() => {
    mockFs({
        [dataPath]: JSON.stringify({
            emails: [
                { id: '1', subject: 'Hello', category: 'Promo' },
                { id: '2', subject: 'Alert', category: 'Security' }
            ],
            categories: [
                { id: '123', name: 'Promo', description: 'Promotions and deals' }
            ]
        })
    });
});

afterEach(() => {
    mockFs.restore();
});

describe('GET /api/email/[category]', () => {
    it('returns 400 if no category is provided', async () => {
        const req = createNextRequest('http://localhost/api/email?name=', 'GET');
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.error).toBeDefined();
    });

    it('returns emails for a valid category', async () => {
        const req = createNextRequest('http://localhost/api/email?name=Promo', 'GET');
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.emails).toHaveLength(1);
        expect(json.emails[0].subject).toBe('Hello');
    });

    it('returns empty array for category with no matches', async () => {
        const req = createNextRequest('http://localhost/api/email?name=Nonexistent', 'GET');
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.emails).toHaveLength(0);
    });
});

describe('POST /api/email/[category]', () => {
    it('returns 400 if name or description is missing', async () => {
        const req = createNextRequest('http://localhost/api/email', 'POST', { name: 'Test' });
        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.error).toBeDefined();
    });

    it('returns 400 if category already exists', async () => {
        const req = createNextRequest('http://localhost/api/email', 'POST', {
            name: 'Promo',
            description: 'Duplicate',
        });
        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(400);
        expect(json.error).toMatch(/already exists/i);
    });

    it('creates new category successfully', async () => {
        const req = createNextRequest('http://localhost/api/email', 'POST', {
            name: 'NewCat',
            description: 'New Description',
        });
        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.category.name).toBe('NewCat');
    });
});
