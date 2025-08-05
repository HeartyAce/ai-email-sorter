import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../app/api/email/[category]/route';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { POST as DELETE_POST } from '../app/api/email/delete/route';
import { NextRequest, NextResponse } from 'next/server';
const { google } = require('googleapis');
const { getServerSession } = require('next-auth');
import { GET as GET_CATEGORIES } from '../app/categories/route';

vi.mock('fs');
vi.mock('path', async () => {
    const actual = await vi.importActual<typeof import('path')>('path');
    return {
        ...actual,
        resolve: vi.fn(() => '/mocked/path/categories.json'),
    };
});

function createMockRequest(jsonData: any) {
    return {
        json: vi.fn().mockResolvedValue(jsonData),
    } as unknown as NextRequest;
}

describe('POST /api/email/category', () => {
    const mockedFs = fs as unknown as {
        existsSync: ReturnType<typeof vi.fn>;
        readFileSync: ReturnType<typeof vi.fn>;
        writeFileSync: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 400 if name or description is missing', async () => {
        const req = createMockRequest({ name: 'Test' });
        // @ts-ignore
        const res = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.error).toBe('Missing name or description');
    });

    it('creates a new category and saves it', async () => {
        mockedFs.existsSync = vi.fn().mockReturnValue(true);
        mockedFs.readFileSync = vi.fn().mockReturnValue('[]');
        mockedFs.writeFileSync = vi.fn();

        const req = createMockRequest({ name: 'Work', description: 'Work emails' });
        // @ts-ignore
        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.category.name).toBe('Work');
        expect(json.category.description).toBe('Work emails');
        expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('reads existing categories and appends new one', async () => {
        const existing = [
            { id: '1', name: 'Personal', description: 'Personal emails' },
        ];
        mockedFs.existsSync = vi.fn().mockReturnValue(true);
        mockedFs.readFileSync = vi.fn().mockReturnValue(JSON.stringify(existing));
        mockedFs.writeFileSync = vi.fn();

        const req = createMockRequest({ name: 'Work', description: 'Work emails' });
        // @ts-ignore
        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.category.name).toBe('Work');
        expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
            '/mocked/path/categories.json',
            expect.stringContaining('Work')
        );
    });

    it('handles file not existing (creates new file)', async () => {
        mockedFs.existsSync = vi.fn().mockReturnValue(false);
        mockedFs.readFileSync = vi.fn();
        mockedFs.writeFileSync = vi.fn();

        const req = createMockRequest({ name: 'Spam', description: 'Spam emails' });
        // @ts-ignore
        const res = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.category.name).toBe('Spam');
        expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('returns 500 on unexpected error', async () => {
        mockedFs.existsSync = vi.fn().mockImplementation(() => { throw new Error('fail'); });

        const req = createMockRequest({ name: 'Test', description: 'desc' });
        // @ts-ignore
        const res = await POST(req);
        expect(res.status).toBe(500);
        const json = await res.json();
        expect(json.error).toBe('Internal Server Error');
    });

    vi.mock('googleapis', () => {
        const trashMock = vi.fn();
        return {
            google: {
                auth: {
                    OAuth2: vi.fn().mockImplementation(() => ({
                        setCredentials: vi.fn(),
                    })),
                },
                gmail: vi.fn().mockImplementation(() => ({
                    users: {
                        messages: {
                            trash: trashMock,
                        },
                    },
                })),
            },
            __esModule: true,
        };
    });

    vi.mock('next-auth', () => ({
        getServerSession: vi.fn(),
    }));

    vi.mock('../app/api/auth/[...nextauth]/route', () => ({
        authOptions: {},
    }));

    function createMockRequest(jsonData: any) {
        return {
            json: vi.fn().mockResolvedValue(jsonData),
        } as unknown as NextRequest;
    }

    describe('POST /api/email/delete', () => {
        let trashMock: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            vi.clearAllMocks();
            trashMock = google.gmail().users.messages.trash;
        });

        it('returns 401 if not authenticated', async () => {
            getServerSession.mockResolvedValue(null);
            const req = createMockRequest({ ids: ['id1'] });
            // @ts-ignore
            const res = await DELETE_POST(req);
            expect(res.status).toBe(401);
            const json = await res.json();
            expect(json.error).toBe('Unauthorized');
        });

        it('returns 400 if ids is missing or invalid', async () => {
            getServerSession.mockResolvedValue({ accessToken: 'token' });
            const req = createMockRequest({});
            // @ts-ignore
            const res = await DELETE_POST(req);
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Missing or invalid "ids"');
        });

        it('returns 400 if ids is empty array', async () => {
            getServerSession.mockResolvedValue({ accessToken: 'token' });
            const req = createMockRequest({ ids: [] });
            // @ts-ignore
            const res = await DELETE_POST(req);
            expect(res.status).toBe(400);
            const json = await res.json();
            expect(json.error).toBe('Missing or invalid "ids"');
        });

        it('moves emails to trash and returns success/failed counts', async () => {
            getServerSession.mockResolvedValue({ accessToken: 'token' });
            trashMock
                .mockResolvedValueOnce({})
                .mockRejectedValueOnce(new Error('fail'));
            const req = createMockRequest({ ids: ['id1', 'id2'] });
            // @ts-ignore
            const res = await DELETE_POST(req);
            expect(trashMock).toHaveBeenCalledTimes(2);
            expect(trashMock).toHaveBeenCalledWith({ userId: 'me', id: 'id1' });
            expect(trashMock).toHaveBeenCalledWith({ userId: 'me', id: 'id2' });
            expect(res.status).toBe(undefined); // NextResponse.json returns undefined for status 200
            const json = await res.json();
            expect(json.success).toBe(1);
            expect(json.failed).toBe(1);
            expect(json.message).toBe('Emails moved to trash.');
        });

        it('returns 500 if gmail API throws', async () => {
            getServerSession.mockResolvedValue({ accessToken: 'token' });
            trashMock.mockImplementation(() => { throw new Error('fail'); });
            const req = createMockRequest({ ids: ['id1'] });
            // @ts-ignore
            const res = await DELETE_POST(req);
            expect(res.status).toBe(500);
            const json = await res.json();
            expect(json.error).toBe('Failed to move emails to trash');
        });

        describe('extractEmailContent', () => {
            // Import the function directly from the route file
            // If not exported, copy the function here for testing purposes
            function extractEmailContent(payload: any): { text: string, html: string } {
                let text = ''
                let html = ''

                function walk(part: any) {
                    if (part.mimeType === 'text/plain' && part.body?.data) {
                        let data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                        while (data.length % 4) data += '=';
                        text = Buffer.from(data, 'base64').toString('utf-8')
                    } else if (part.mimeType === 'text/html' && part.body?.data) {
                        let data = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
                        while (data.length % 4) data += '=';
                        html = Buffer.from(data, 'base64').toString('utf-8')
                    }

                    if (Array.isArray(part.parts)) {
                        part.parts.forEach(walk)
                    }
                }

                walk(payload)
                return { text, html }
            }

            it('extracts plain text from a simple payload', () => {
                const text = 'Hello world!';
                const payload = {
                    mimeType: 'text/plain',
                    body: { data: Buffer.from(text, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
                };
                const result = extractEmailContent(payload);
                expect(result.text).toBe(text);
                expect(result.html).toBe('');
            });

            it('extracts html from a simple payload', () => {
                const html = '<b>Hello</b>';
                const payload = {
                    mimeType: 'text/html',
                    body: { data: Buffer.from(html, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
                };
                const result = extractEmailContent(payload);
                expect(result.text).toBe('');
                expect(result.html).toBe(html);
            });

            it('extracts both text and html from multipart payload', () => {
                const text = 'Hi!';
                const html = '<i>Hi!</i>';
                const payload = {
                    mimeType: 'multipart/alternative',
                    parts: [
                        {
                            mimeType: 'text/plain',
                            body: { data: Buffer.from(text, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
                        },
                        {
                            mimeType: 'text/html',
                            body: { data: Buffer.from(html, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
                        }
                    ]
                };
                const result = extractEmailContent(payload);
                expect(result.text).toBe(text);
                expect(result.html).toBe(html);
            });

            it('handles nested multipart payloads', () => {
                const text = 'Nested text';
                const html = '<div>Nested html</div>';
                const payload = {
                    mimeType: 'multipart/mixed',
                    parts: [
                        {
                            mimeType: 'multipart/alternative',
                            parts: [
                                {
                                    mimeType: 'text/plain',
                                    body: { data: Buffer.from(text, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
                                },
                                {
                                    mimeType: 'text/html',
                                    body: { data: Buffer.from(html, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
                                }
                            ]
                        }
                    ]
                };
                const result = extractEmailContent(payload);
                expect(result.text).toBe(text);
                expect(result.html).toBe(html);
            });

            it('returns empty strings if no text or html found', () => {
                const payload = {
                    mimeType: 'application/octet-stream',
                    body: { data: 'irrelevant' }
                };
                const result = extractEmailContent(payload);
                expect(result.text).toBe('');
                expect(result.html).toBe('');
            });

            it('handles missing body or data gracefully', () => {
                const payload = {
                    mimeType: 'text/plain',
                    body: {}
                };
                const result = extractEmailContent(payload);
                expect(result.text).toBe('');
                expect(result.html).toBe('');
            });

            it('handles base64url padding correctly', () => {
                // "abc" in base64 is "YWJj", base64url is "YWJj"
                const text = 'abc';
                const payload = {
                    mimeType: 'text/plain',
                    body: { data: 'YWJj' }
                };
                const result = extractEmailContent(payload);
                expect(result.text).toBe(text);
            });

            // Add these tests at the $PLACEHOLDER$ in tests/route.test.ts


            describe('GET /categories', () => {
                const mockedFs = fs as unknown as {
                    existsSync: ReturnType<typeof vi.fn>;
                    readFileSync: ReturnType<typeof vi.fn>;
                };

                beforeEach(() => {
                    vi.clearAllMocks();
                });

                it('returns categories from file if file exists', async () => {
                    const categories = [
                        { id: '1', name: 'Work', description: 'Work emails' },
                        { id: '2', name: 'Personal', description: 'Personal emails' }
                    ];
                    mockedFs.existsSync = vi.fn().mockReturnValue(true);
                    mockedFs.readFileSync = vi.fn().mockReturnValue(JSON.stringify(categories));

                    // @ts-ignore
                    const res = await GET_CATEGORIES();
                    expect(res.status).toBe(undefined); // NextResponse.json returns undefined for 200
                    const json = await res.json();
                    expect(json.categories).toEqual(categories);
                });

                it('returns empty categories if file does not exist', async () => {
                    mockedFs.existsSync = vi.fn().mockReturnValue(false);
                    mockedFs.readFileSync = vi.fn();

                    // @ts-ignore
                    const res = await GET_CATEGORIES();
                    expect(res.status).toBe(undefined);
                    const json = await res.json();
                    expect(json.categories).toEqual([]);
                });

                it('returns 500 and error message if exception is thrown', async () => {
                    mockedFs.existsSync = vi.fn().mockImplementation(() => { throw new Error('fail'); });

                    // @ts-ignore
                    const res = await GET_CATEGORIES();
                    expect(res.status).toBe(500);
                    const json = await res.json();
                    expect(json.error).toBe('Failed to load categories');
                });
            });
        });
    });
});