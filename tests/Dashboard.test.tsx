import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { vi } from 'vitest';

vi.mock('html2pdf.js', () => ({
    default: () => ({ from: () => ({ save: vi.fn() }) })
}));

// Mock fetch
global.fetch = vi.fn((url) => {
    if (url === '/api/gmail/process') {
        return Promise.resolve({
            json: () => Promise.resolve({
                results: [
                    { id: '1', subject: 'Hello', summary: 'Greeting', body: 'Hi there!', category: 'Promo' },
                    { id: '2', subject: 'Security Alert', summary: 'Important', body: 'Check your account', category: 'Security' }
                ]
            }),
        });
    }

    if (url === '/api/categories') {
        return Promise.resolve({
            json: () => Promise.resolve({
                categories: [
                    { id: '1', name: 'Promo', description: 'Promotions' },
                    { id: '2', name: 'Security', description: 'Alerts' },
                ]
            }),
        });
    }

    return Promise.resolve({ json: () => ({}) });
}) as any;

describe('Dashboard Component', () => {
    it('renders loading initially', () => {
        render(<Dashboard />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('displays emails after fetch', async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Hello')).toBeInTheDocument();
            expect(screen.getByText('Security Alert')).toBeInTheDocument();
        });
    });

    it('filters by category', async () => {
        render(<Dashboard />);

        await waitFor(() => {
            expect(screen.getByText('Hello')).toBeInTheDocument();
        });

        const select = screen.getByRole('combobox');
        fireEvent.change(select, { target: { value: 'Security' } });

        await waitFor(() => {
            expect(screen.queryByText('Hello')).not.toBeInTheDocument();
            expect(screen.getByText('Security Alert')).toBeInTheDocument();
        });
    });

    it('shows and hides add category form', async () => {
        render(<Dashboard />);
        const addBtn = screen.getByText('+ Add Category');

        fireEvent.click(addBtn);
        expect(screen.getByPlaceholderText(/category name/i)).toBeInTheDocument();

        fireEvent.click(addBtn); // toggle again
        expect(screen.queryByPlaceholderText(/category name/i)).not.toBeInTheDocument();
    });
});
