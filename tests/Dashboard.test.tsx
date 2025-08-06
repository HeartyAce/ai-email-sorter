import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DashboardClient from '@/app/dashboard/DashboardClient'; // ✅ Use client component
import { vi } from 'vitest';

// ✅ Mock html2pdf
vi.mock('html2pdf.js', () => ({
    default: () => ({ from: () => ({ save: vi.fn() }) })
}));

// ✅ Mock fetch globally
beforeEach(() => {
    global.fetch = vi.fn((url) => {
        if (url === '/api/gmail/process') {
            return Promise.resolve({
                json: () => Promise.resolve({
                    results: [
                        {
                            id: '1',
                            subject: 'Hello',
                            summary: 'Greeting',
                            body: 'Hi there!',
                            category: 'Promo'
                        },
                        {
                            id: '2',
                            subject: 'Security Alert',
                            summary: 'Important',
                            body: 'Check your account',
                            category: 'Security'
                        }
                    ]
                })
            });
        }

        if (url === '/api/categories') {
            return Promise.resolve({
                json: () => Promise.resolve({
                    categories: [
                        { id: '1', name: 'Promo', description: 'Promotions' },
                        { id: '2', name: 'Security', description: 'Alerts' }
                    ]
                })
            });
        }

        return Promise.resolve({ json: () => ({}) });
    }) as any;
});

describe('DashboardClient Component', () => {
    it('renders loading initially', async () => {
        render(<DashboardClient />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });


    it('displays emails after fetch', async () => {
        render(<DashboardClient />);

        await waitFor(() => {
            expect(screen.getByText('Hello')).toBeInTheDocument();
            expect(screen.getByText('Security Alert')).toBeInTheDocument();
        });
    });

    it('renders Sign Out button', async () => {
        render(<DashboardClient />);
        await waitFor(() => {
            expect(screen.getByText('Sign Out')).toBeInTheDocument();
        });
    });

    it('filters by category', async () => {
        render(<DashboardClient />);

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
        render(<DashboardClient />);
        await waitFor(() => {
            expect(screen.getByText('+ Add Category')).toBeInTheDocument();
        });

        const addBtn = screen.getByText('+ Add Category');
        fireEvent.click(addBtn);

        expect(screen.getByPlaceholderText(/category name/i)).toBeInTheDocument();

        fireEvent.click(addBtn); // toggle again
        expect(screen.queryByPlaceholderText(/category name/i)).not.toBeInTheDocument();
    });
});
