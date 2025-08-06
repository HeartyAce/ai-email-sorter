import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as db from '@/lib/db';
import fs from 'fs';
import * as fs from 'fs';

vi.mock('fs', () => ({
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
}));

const mockEmails = [
    { id: '1', subject: 'Test 1', summary: 'Summary 1', category: 'Promo' },
    { id: '2', subject: 'Test 2', summary: 'Summary 2', category: 'Security' },
];

describe('db.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getEmails', () => {
        it('returns empty array if db.json does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const result = db.getEmails();
            expect(result).toEqual([]);
        });

        it('returns parsed emails from file', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockEmails));

            const result = db.getEmails();
            expect(result).toEqual(mockEmails);
        });
    });

    describe('saveEmails', () => {
        it('adds only new emails to the db', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([mockEmails[0]]));

            const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => { });

            db.saveEmails(mockEmails);

            expect(writeSpy).toHaveBeenCalledWith(
                expect.stringContaining('db.json'),
                JSON.stringify([...mockEmails], null, 2)
            );
        });

        it('writes all emails if db is initially empty', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([]));

            const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => { });
            db.saveEmails(mockEmails);

            expect(writeSpy).toHaveBeenCalled();
            const written = JSON.parse(writeSpy.mock.calls[0][1]);
            expect(written).toHaveLength(2);
        });
    });

    describe('getEmailsByCategory', () => {
        it('returns only emails matching the category', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockEmails));

            const promoEmails = db.getEmailsByCategory('Promo');
            expect(promoEmails).toEqual([mockEmails[0]]);
        });

        it('returns empty array for non-matching category', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockEmails));

            const other = db.getEmailsByCategory('Other');
            expect(other).toEqual([]);
        });
    });
});
