import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CategoryPage from '../app/categories/[category]/page'
import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import EmailDetail from '../app/api/email/[id]/page'
import Dashboard from '../app/dashboard/page'

// Mock next/navigation useParams
vi.mock('next/navigation', () => ({
    useParams: () => ({ category: 'work' }),
}))

// Mock next/link
vi.mock('next/link', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock Button component
vi.mock('@/components/ui/button', () => ({
    Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}))

describe('CategoryPage', () => {
    const mockEmails = [
        {
            id: '1',
            subject: 'Test Email 1',
            summary: 'Summary 1',
            category: 'work',
        },
        {
            id: '2',
            subject: 'Test Email 2',
            summary: 'Summary 2',
            category: 'work',
        },
    ]

    beforeEach(() => {
        global.fetch = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ emails: mockEmails }),
            })
        ) as any
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('renders loading state initially', () => {
        render(<CategoryPage />)
        expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('fetches and displays emails', async () => {
        render(<CategoryPage />)
        await waitFor(() => {
            expect(screen.getByText('Test Email 1')).toBeInTheDocument()
            expect(screen.getByText('Test Email 2')).toBeInTheDocument()
        })
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
        expect(global.fetch).toHaveBeenCalledWith('/api/emails/work')
    })

    it('renders category name in header', () => {
        render(<CategoryPage />)
        expect(screen.getByText(/work Emails/i)).toBeInTheDocument()
    })

    it('renders back to categories button', () => {
        render(<CategoryPage />)
        expect(screen.getByRole('button', { name: /back to categories/i })).toBeInTheDocument()
    })

    it('shows empty state if no emails', async () => {
        ; (global.fetch as any) = vi.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ emails: [] }),
            })
        )
        render(<CategoryPage />)
        await waitFor(() => {
            // Should render the grid but with no emails
            expect(screen.queryByText('Test Email 1')).not.toBeInTheDocument()
            expect(screen.queryByText('Test Email 2')).not.toBeInTheDocument()
        })
    })

    // EmailDetail tests for /app/api/email/[id]/page.tsx


    // Mock next-auth/react
    vi.mock('next-auth/react', () => ({
        useSession: () => ({
            data: { accessToken: 'mock-token' },
        }),
    }))

    // Mock next/navigation
    const pushMock = vi.fn()
    vi.mock('next/navigation', () => ({
        useRouter: () => ({
            push: pushMock,
        }),
    }))

    // Mock next/link
    vi.mock('next/link', () => ({
        __esModule: true,
        default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    }))

    // Mock lucide-react icons
    vi.mock('lucide-react', () => ({
        Loader2: (props: any) => <svg {...props} data-testid="loader" />,
        Trash: (props: any) => <svg {...props} data-testid="trash" />,
        MailX: (props: any) => <svg {...props} data-testid="mailx" />,
    }))

    // Mock Button component
    vi.mock('@/app/components/ui/button', () => ({
        Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    }))

    // Import the component under test

    describe('EmailDetail', () => {
        const mockEmail = {
            subject: 'Hello World',
            from: 'test@example.com',
            date: '2024-06-01',
            bodyText: 'This is the plain text body.',
            bodyHtml: '<b>This is the HTML body.</b>',
        }

        beforeEach(() => {
            global.fetch = vi.fn((url: string) => {
                if (url.startsWith('/api/email?id=')) {
                    return Promise.resolve({
                        json: () => Promise.resolve(mockEmail),
                    })
                }
                if (url.startsWith('/api/email/delete')) {
                    return Promise.resolve({})
                }
                if (url.startsWith('/api/email/unsubscribe')) {
                    return Promise.resolve({})
                }
                return Promise.reject(new Error('Unknown endpoint'))
            }) as any
            pushMock.mockClear()
        })

        afterEach(() => {
            vi.clearAllMocks()
        })

        it('renders loading state initially', () => {
            render(<EmailDetail params={{ id: '123' }} />)
            expect(screen.getByText(/loading email/i)).toBeInTheDocument()
            expect(screen.getByTestId('loader')).toBeInTheDocument()
        })

        it('fetches and displays email details', async () => {
            render(<EmailDetail params={{ id: '123' }} />)
            await waitFor(() => {
                expect(screen.getByText('Hello World')).toBeInTheDocument()
                expect(screen.getByText(/test@example.com/)).toBeInTheDocument()
                expect(screen.getByText(/2024-06-01/)).toBeInTheDocument()
                expect(screen.getByText('This is the plain text body.')).toBeInTheDocument()
            })
        })

        it('toggles between plain text and HTML body', async () => {
            render(<EmailDetail params={{ id: '123' }} />)
            await waitFor(() => {
                expect(screen.getByText('This is the plain text body.')).toBeInTheDocument()
            })
            const toggleBtn = screen.getByRole('button', { name: /show html/i })
            fireEvent.click(toggleBtn)
            expect(screen.getByText(/no html version available/i)).not.toBeInTheDocument()
            expect(screen.getByText('Show Plain Text')).toBeInTheDocument()
            // HTML body is rendered as HTML, so we check for its presence
            expect(screen.getByText('This is the HTML body.', { selector: 'b' })).toBeInTheDocument()
        })

        it('calls delete API and redirects on delete', async () => {
            render(<EmailDetail params={{ id: '123' }} />)
            await waitFor(() => {
                expect(screen.getByText('Hello World')).toBeInTheDocument()
            })
            const deleteBtn = screen.getByRole('button', { name: /delete email/i })
            fireEvent.click(deleteBtn)
            await waitFor(() => {
                expect(pushMock).toHaveBeenCalledWith('/dashboard')
            })
        })

        it('calls unsubscribe API and shows alert', async () => {
            window.alert = vi.fn()
            render(<EmailDetail params={{ id: '123' }} />)
            await waitFor(() => {
                expect(screen.getByText('Hello World')).toBeInTheDocument()
            })
            const unsubscribeBtn = screen.getByRole('button', { name: /unsubscribe/i })
            fireEvent.click(unsubscribeBtn)
            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/unsubscribe attempted/i))
            })
        })

        it('shows error message if fetch fails', async () => {
            (global.fetch as any) = vi.fn(() => Promise.reject(new Error('fail')))
            render(<EmailDetail params={{ id: 'fail' }} />)
            await waitFor(() => {
                expect(screen.getByText(/failed to load email/i)).toBeInTheDocument()
            })
        })

        // Mock next/navigation useParams
        vi.mock('next/navigation', () => ({
            useParams: () => ({ category: 'work' }),
        }))

        // Mock next/link
        vi.mock('next/link', () => ({
            __esModule: true,
            default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        }))

        // Mock Button component
        vi.mock('@/components/ui/button', () => ({
            Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
        }))

        // Mock framer-motion
        vi.mock('framer-motion', () => ({
            motion: {
                div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
            },
        }))

        describe('CategoryPage', () => {
            const mockEmails = [
                {
                    id: '1',
                    subject: 'Test Email 1',
                    summary: 'Summary 1',
                    category: 'work',
                },
                {
                    id: '2',
                    subject: 'Test Email 2',
                    summary: 'Summary 2',
                    category: 'work',
                },
            ]

            beforeEach(() => {
                global.fetch = vi.fn(() =>
                    Promise.resolve({
                        json: () => Promise.resolve({ emails: mockEmails }),
                    })
                ) as any
            })

            afterEach(() => {
                vi.clearAllMocks()
            })

            it('renders loading state initially', () => {
                render(<CategoryPage />)
                expect(screen.getByText(/loading/i)).toBeInTheDocument()
            })

            it('fetches and displays emails', async () => {
                render(<CategoryPage />)
                await waitFor(() => {
                    expect(screen.getByText('Test Email 1')).toBeInTheDocument()
                    expect(screen.getByText('Test Email 2')).toBeInTheDocument()
                })
                expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
                expect(global.fetch).toHaveBeenCalledWith('/api/emails/work')
            })

            it('renders category name in header', () => {
                render(<CategoryPage />)
                expect(screen.getByText(/work Emails/i)).toBeInTheDocument()
            })

            it('renders back to categories button', () => {
                render(<CategoryPage />)
                expect(screen.getByRole('button', { name: /back to categories/i })).toBeInTheDocument()
            })

            it('shows empty state if no emails', async () => {
                ; (global.fetch as any) = vi.fn(() =>
                    Promise.resolve({
                        json: () => Promise.resolve({ emails: [] }),
                    })
                )
                render(<CategoryPage />)
                await waitFor(() => {
                    expect(screen.queryByText('Test Email 1')).not.toBeInTheDocument()
                    expect(screen.queryByText('Test Email 2')).not.toBeInTheDocument()
                })
            })

            it('does not fetch if category is missing', async () => {
                // Override useParams to return no category
                vi.doMock('next/navigation', () => ({
                    useParams: () => ({}),
                }))
                render(<CategoryPage />)
                expect(global.fetch).not.toHaveBeenCalled()
            })

            // Mock next/navigation
            vi.mock('next/navigation', () => ({
                useRouter: () => ({
                    push: vi.fn(),
                }),
            }))

            // Mock framer-motion
            vi.mock('framer-motion', () => ({
                motion: {
                    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
                },
            }))

            // Mock lucide-react icons
            vi.mock('lucide-react', () => ({
                Shield: (props: any) => <svg {...props} data-testid="shield" />,
                Gift: (props: any) => <svg {...props} data-testid="gift" />,
                Mail: (props: any) => <svg {...props} data-testid="mail" />,
                Trash: (props: any) => <svg {...props} data-testid="trash" />,
                MailX: (props: any) => <svg {...props} data-testid="mailx" />,
                CheckSquare: (props: any) => <svg {...props} data-testid="checksquare" />,
                XSquare: (props: any) => <svg {...props} data-testid="xsquare" />,
            }))

            // Mock ThemeToggle
            vi.mock('@/components/ThemeToggle', () => ({
                __esModule: true,
                default: () => <div data-testid="theme-toggle" />,
            }))

            // Mock next/link
            vi.mock('next/link', () => ({
                __esModule: true,
                default: ({ children, href }: { children: React.ReactNode, href: string }) => <a href={href}>{children}</a>,
            }))

            // Mock html2pdf.js
            const saveMock = vi.fn()
            const fromMock = vi.fn(() => ({ save: saveMock }))
            vi.mock('html2pdf.js', () => ({
                __esModule: true,
                default: () => ({
                    from: fromMock,
                }),
                from: fromMock,
            }))

            // Import Dashboard after mocks

            describe('Dashboard', () => {
                const mockEmails = [
                    { id: '1', subject: 'Subject 1', summary: 'Summary 1', category: 'Security' },
                    { id: '2', subject: 'Subject 2', summary: 'Summary 2', category: 'Promo' },
                    { id: '3', subject: 'Subject 3', summary: 'Summary 3', category: 'Other' },
                ]
                const mockCategories = {
                    categories: [
                        { name: 'Security', description: '' },
                        { name: 'Promo', description: '' },
                        { name: 'Other', description: '' },
                    ]
                }

                beforeEach(() => {
                    let callCount = 0
                    global.fetch = vi.fn((url: string, opts?: any) => {
                        if (url === '/api/gmail/process') {
                            return Promise.resolve({
                                json: () => Promise.resolve({ results: mockEmails }),
                            })
                        }
                        if (url === '/api/categories') {
                            return Promise.resolve({
                                json: () => Promise.resolve(mockCategories),
                            })
                        }
                        if (url === '/api/emails/category') {
                            // POST for add category
                            if (opts && opts.method === 'POST') {
                                return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
                            }
                        }
                        if (url === '/api/email/delete') {
                            return Promise.resolve({
                                json: () => Promise.resolve({ success: ['1'], failed: [] }),
                            })
                        }
                        return Promise.reject(new Error('Unknown endpoint'))
                    }) as any
                    window.alert = vi.fn()
                    saveMock.mockClear()
                    fromMock.mockClear()
                })

                afterEach(() => {
                    vi.clearAllMocks()
                })

                it('renders loading state initially', () => {
                    render(<Dashboard />)
                    expect(screen.getByText(/loading/i)).toBeInTheDocument()
                })

                it('fetches and displays emails and categories', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                        expect(screen.getByText('Subject 2')).toBeInTheDocument()
                        expect(screen.getByText('Subject 3')).toBeInTheDocument()
                    })
                    // Category select should have all categories
                    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument()
                    expect(screen.getByRole('option', { name: 'Security' })).toBeInTheDocument()
                    expect(screen.getByRole('option', { name: 'Promo' })).toBeInTheDocument()
                    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument()
                })

                it('filters emails by category', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                    })
                    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Promo' } })
                    expect(screen.getByText('Subject 2')).toBeInTheDocument()
                    expect(screen.queryByText('Subject 1')).not.toBeInTheDocument()
                    expect(screen.queryByText('Subject 3')).not.toBeInTheDocument()
                })

                it('shows empty state if no emails for category', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                    })
                    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Nonexistent' } })
                    expect(screen.getByText(/no emails found/i)).toBeInTheDocument()
                })

                it('can select and deselect all emails', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                    })
                    // Select All
                    fireEvent.click(screen.getByRole('button', { name: /select all/i }))
                    const checkboxes = screen.getAllByRole('checkbox')
                    checkboxes.forEach(cb => expect(cb).toBeChecked())
                    // Deselect All
                    fireEvent.click(screen.getByRole('button', { name: /deselect all/i }))
                    screen.getAllByRole('checkbox').forEach(cb => expect(cb).not.toBeChecked())
                })

                it('toggles email selection on checkbox click', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                    })
                    const checkboxes = screen.getAllByRole('checkbox')
                    fireEvent.click(checkboxes[0])
                    expect(checkboxes[0]).toBeChecked()
                    fireEvent.click(checkboxes[0])
                    expect(checkboxes[0]).not.toBeChecked()
                })

                it('calls exportPDF when Export to PDF button is clicked', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                    })
                    // Add export-section to DOM for html2pdf
                    const exportSection = document.createElement('div')
                    exportSection.id = 'export-section'
                    document.body.appendChild(exportSection)
                    fireEvent.click(screen.getByRole('button', { name: /export to pdf/i }))
                    expect(fromMock).toHaveBeenCalled()
                    expect(saveMock).toHaveBeenCalled()
                    document.body.removeChild(exportSection)
                })

                it('shows and submits add category form', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                    })
                    fireEvent.click(screen.getByRole('button', { name: /\+ add category/i }))
                    fireEvent.change(screen.getByPlaceholderText(/category name/i), { target: { value: 'NewCat' } })
                    fireEvent.change(screen.getByPlaceholderText(/description/i), { target: { value: 'Desc' } })
                    fireEvent.click(screen.getByRole('button', { name: /save category/i }))
                    await waitFor(() => {
                        expect(global.fetch).toHaveBeenCalledWith('/api/emails/category', expect.objectContaining({
                            method: 'POST',
                        }))
                    })
                })

                it('alerts if add category fails', async () => {
                    (global.fetch as any) = vi.fn((url: string, opts?: any) => {
                        if (url === '/api/gmail/process') {
                            return Promise.resolve({ json: () => Promise.resolve({ results: mockEmails }) })
                        }
                        if (url === '/api/categories') {
                            return Promise.resolve({ json: () => Promise.resolve(mockCategories) })
                        }
                        if (url === '/api/emails/category') {
                            return Promise.resolve({
                                ok: false,
                                json: () => Promise.resolve({ error: 'fail' }),
                            })
                        }
                        return Promise.reject(new Error('Unknown endpoint'))
                    })
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                    })
                    fireEvent.click(screen.getByRole('button', { name: /\+ add category/i }))
                    fireEvent.change(screen.getByPlaceholderText(/category name/i), { target: { value: 'BadCat' } })
                    fireEvent.click(screen.getByRole('button', { name: /save category/i }))
                    await waitFor(() => {
                        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error adding category'))
                    })
                })

                it('alerts on unsubscribe', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                    })
                    // Select one email
                    fireEvent.click(screen.getAllByRole('checkbox')[0])
                    fireEvent.click(screen.getByRole('button', { name: /unsubscribe/i }))
                    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/would attempt to unsubscribe/i))
                })

                it('calls delete API and removes emails', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByText('Subject 1')).toBeInTheDocument()
                    })
                    // Select one email
                    fireEvent.click(screen.getAllByRole('checkbox')[0])
                    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
                    await waitFor(() => {
                        expect(global.fetch).toHaveBeenCalledWith('/api/email/delete', expect.anything())
                        // Email should be removed from DOM
                        expect(screen.queryByText('Subject 1')).not.toBeInTheDocument()
                    })
                })

                it('renders ThemeToggle', async () => {
                    render(<Dashboard />)
                    await waitFor(() => {
                        expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
                    })
                })
            })
        })
    })
})

// We recommend installing an extension to run vitest tests.