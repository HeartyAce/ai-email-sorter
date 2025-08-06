'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Shield, Gift, Mail, Trash, MailX, CheckSquare, XSquare,
} from 'lucide-react';
import { PDFExportButton } from '@/components/PDFExportButton'
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';

interface EmailSummary {
    id: string;
    subject: string;
    summary: string;
    body: string;
    category: string;
}

interface Category {
    id: string;
    name: string;
    description: string;
}

export default function Dashboard() {
    const [emails, setEmails] = useState<EmailSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [categories, setCategories] = useState<string[]>(['All']);

    const [showForm, setShowForm] = useState(false);
    const [newCategory, setNewCategory] = useState({ name: '', description: '' });

    // Fetch emails
    useEffect(() => {
        fetch('/api/gmail/process')
            .then((res) => res.json())
            .then((data: { results: EmailSummary[] }) => {
                setEmails(data.results || []);
                setLoading(false);
            });
    }, []);

    // Fetch categories
    useEffect(() => {
        fetch('/api/categories')
            .then((res) => res.json())
            .then((data: { categories: Category[] }) => {
                setCategories(['All', ...data.categories.map((c) => c.name)]);
            });
    }, []);

    const handleAddCategory = async () => {
        try {
            const res = await fetch('/api/email/category', {
                method: 'POST',
                body: JSON.stringify(newCategory),
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) {
                const errorData = await res.json();
                alert('Error adding category: ' + errorData.error);
                return;
            }

            setNewCategory({ name: '', description: '' });
            setShowForm(false);

            // Properly re-fetch updated categories
            const catRes = await fetch('/api/categories');
            const catData = await catRes.json();

            if (Array.isArray(catData.categories)) {
                setCategories(['All', ...catData.categories.map((c: Category) => c.name)]);
            } else {
                console.error('Categories response malformed:', catData);
            }

        } catch (err) {
            console.error('Failed to add category:', err);
            alert('An error occurred. Check console for details.');
        }
    };

    const filtered =
        selectedCategory === 'All'
            ? emails
            : emails.filter((e) => e.category === selectedCategory);

    const getIcon = (category: string) => {
        switch (category) {
            case 'Security': return <Shield className="w-4 h-4" />;
            case 'Promo': return <Gift className="w-4 h-4" />;
            default: return <Mail className="w-4 h-4" />;
        }
    };

    const toggleEmailSelect = (id: string) => {
        const updated = new Set(selectedEmails);
        updated.has(id) ? updated.delete(id) : updated.add(id);
        setSelectedEmails(updated);
    };

    const selectAll = () => setSelectedEmails(new Set(filtered.map((e) => e.id)));
    const deselectAll = () => setSelectedEmails(new Set());

    const exportPDF = async () => {
        const element = document.getElementById('export-section');
        if (!element) return;
        const html2pdf = (await import('html2pdf.js')).default;
        html2pdf().from(element).save('inbox-summary.pdf');
    };


    const handleUnsubscribe = () => {
        alert(`Would attempt to unsubscribe ${selectedEmails.size} email(s)...`);
    };

    const handleDelete = async () => {
        const toDelete = Array.from(selectedEmails);
        if (toDelete.length === 0) return;

        try {
            const res = await fetch('/api/email/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: toDelete }),
            });

            const { success, failed } = await res.json();
            console.log(`Deleted: ${success}, Failed: ${failed}`);

            const remaining = emails.filter((e) => !selectedEmails.has(e.id));
            setEmails(remaining);
            setSelectedEmails(new Set());
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    return (
        <main className="min-h-screen p-6 bg-background text-foreground">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">📬 Inbox Summary</h1>
                    <select
                        className="bg-background border px-3 py-2 rounded-md text-sm w-fit"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="px-4 py-2 border rounded-md text-sm mt-2 w-fit"
                    >
                        + Add Category
                    </button>

                    {showForm && (
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="Category name"
                                value={newCategory.name}
                                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                className="border p-2 rounded-md w-64"
                            />
                            <input
                                type="text"
                                placeholder="Description"
                                value={newCategory.description}
                                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                className="border p-2 rounded-md w-64"
                            />
                            <button
                                onClick={handleAddCategory}
                                className="px-4 py-2 border rounded-md text-sm bg-primary text-white"
                            >
                                Save Category
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <button onClick={exportPDF} className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition">
                        Export to PDF
                    </button>
                    <button onClick={selectAll} className="px-4 py-2 text-sm rounded-md border flex items-center gap-1">
                        <CheckSquare className="w-4 h-4" /> Select All
                    </button>
                    <button onClick={deselectAll} className="px-4 py-2 text-sm rounded-md border flex items-center gap-1">
                        <XSquare className="w-4 h-4" /> Deselect All
                    </button>
                    <button onClick={handleUnsubscribe} disabled={selectedEmails.size === 0}
                        className="flex items-center gap-1 px-4 py-2 text-sm rounded-md border hover:bg-muted transition">
                        <MailX className="w-4 h-4" /> Unsubscribe
                    </button>
                    <button onClick={handleDelete} disabled={selectedEmails.size === 0}
                        className="flex items-center gap-1 px-4 py-2 text-sm rounded-md border hover:bg-muted transition text-red-500">
                        <Trash className="w-4 h-4" /> Delete
                    </button>
                    <ThemeToggle />
                </div>
            </header>

            {loading ? (
                <p className="p-6">Loading...</p>
            ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground mt-10">No emails found.</p>
            ) : (
                <div id="export-section" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((email) => (
                        <motion.div
                            key={email.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`rounded-2xl shadow-xl p-4 border transition-transform relative cursor-pointer backdrop-blur-sm
                            ${selectedEmails.has(email.id)
                                    ? 'ring-2 ring-primary bg-blue-100 dark:bg-blue-900'
                                    : 'bg-white/10 dark:bg-white/5'}`}
                        >
                            <input
                                type="checkbox"
                                checked={selectedEmails.has(email.id)}
                                onChange={() => toggleEmailSelect(email.id)}
                                className="absolute top-3 right-3 w-4 h-4"
                            />
                            <Link href={`/categories/${encodeURIComponent(email.category)}`}>
                                <div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        {getIcon(email.category)} {email.category}
                                    </div>
                                    <h2 className="text-lg font-bold mt-2">{email.subject}</h2>
                                    <p className="text-sm text-muted-foreground mt-2">{email.summary}</p>
                                    {email.body && (
                                        <p className="text-sm mt-2 whitespace-pre-wrap">{email.body}</p>
                                    )}
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </main>
    );
}
