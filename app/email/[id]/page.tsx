'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Trash, MailX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Session } from 'next-auth'

interface ExtendedSession extends Session {
    accessToken?: string;
}

export default function EmailDetail() {
    const { id } = useParams() as { id: string }
    const { data: session } = useSession() as { data: ExtendedSession | null }
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [email, setEmail] = useState<{
        subject: string
        from: string
        date: string
        bodyText: string
        bodyHtml: string
    } | null>(null)

    const [showHtml, setShowHtml] = useState(false)

    useEffect(() => {
        if (!session?.accessToken || !id) return;

        const fetchEmail = async () => {
            try {
                const res = await fetch(`/api/email?id=${encodeURIComponent(id)}`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                });

                console.log('📩 Fetch status:', res.status);

                if (!res.ok) {
                    throw new Error(`Failed to fetch email. Status: ${res.status}`);
                }

                const data = await res.json();
                console.log('📨 Email fetched:', data);

                if (!data || !data.subject) {
                    throw new Error('No valid email data returned.');
                }

                setEmail(data);
            } catch (e) {
                console.error('❌ Failed to fetch email:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchEmail();
    }, [id, session?.accessToken]);

    const handleDelete = async () => {
        try {
            await fetch(`/api/email/delete?id=${encodeURIComponent(id)}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
            })
            router.push('/dashboard')
        } catch (e) {
            console.error('Delete failed', e)
        }
    }

    const handleUnsubscribe = async () => {
        try {
            await fetch(`/api/email/unsubscribe?id=${encodeURIComponent(id)}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.accessToken}`,
                },
            })
            alert('Unsubscribe attempted (check logs for details).')
        } catch (e) {
            console.error('Unsubscribe failed', e)
        }
    }

    return (
        <main className="min-h-screen p-6 space-y-6">
            <Link href="/dashboard" className="text-sm underline inline-block">
                ← Back to Dashboard
            </Link>

            {loading ? (
                <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading email...</span>
                </div>
            ) : email ? (
                <div className="space-y-4">
                    <header>
                        <h1 className="text-2xl font-bold">{email.subject}</h1>
                        <p className="text-sm text-muted-foreground">
                            From: {email.from} <br />
                            Date: {email.date}
                        </p>
                    </header>

                    <div className="flex gap-3">
                        <Button onClick={() => setShowHtml(!showHtml)} variant="outline">
                            {showHtml ? 'Show Plain Text' : 'Show HTML'}
                        </Button>
                        <Button onClick={handleUnsubscribe} variant="ghost">
                            <MailX className="w-4 h-4 mr-1" />
                            Unsubscribe
                        </Button>
                        <Button onClick={handleDelete} variant="destructive">
                            <Trash className="w-4 h-4 mr-1" />
                            Delete Email
                        </Button>
                    </div>

                    <section className="p-4 rounded border bg-muted text-sm whitespace-pre-wrap">
                        {showHtml ? (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: email.bodyHtml || '<i>No HTML version available.</i>',
                                }}
                            />
                        ) : (
                            <pre>{email.bodyText}</pre>
                        )}
                    </section>
                </div>
            ) : (
                <p>Failed to load email.</p>
            )}
        </main>
    )
}
