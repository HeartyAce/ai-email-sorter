'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

type Email = {
    id: string
    subject: string
    summary: string
    body: string
    category: string
}


export default function CategoryPage() {
    const { category } = useParams()
    const [emails, setEmails] = useState<Email[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!category) return;
        fetch(`/api/emails/${encodeURIComponent(category as string)}`)
            .then(res => res.json())
            .then(data => {
                setEmails(data.emails || []);
                setLoading(false);
            });
    }, [category])

    return (
        <main className="min-h-screen p-6 space-y-6">
            <header className="flex justify-between items-center">
                <h1 className="text-2xl font-bold capitalize">{category} Emails</h1>
                <Link href="/dashboard">
                    <Button variant="outline">← Back to Categories</Button>
                </Link>
            </header>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {emails.map(email => (
                        <motion.div
                            key={email.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className="rounded-xl border p-4 shadow-sm bg-card space-y-2"
                        >
                            <h2 className="font-semibold text-lg">{email.subject}</h2>
                            <p className="text-sm text-muted-foreground">{email.summary}</p>
                            <hr />
                            <p className="text-sm">{email.body}</p> {/* 👈 This is the full content */}
                        </motion.div>
                    ))}
                </div>

            )}
        </main>
    )
}
