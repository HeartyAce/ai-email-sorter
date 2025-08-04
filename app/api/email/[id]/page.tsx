'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Trash, MailX } from 'lucide-react'
import { Button } from '@/app/components/ui/button'

import { getEmails } from '@/lib/db'

export default async function EmailDetail({ params }: { params: { id: string } }) {
    const emails = await getEmails()
    const email = emails.find(e => e.id === params.id)

    if (!email) return <p>Email not found.</p>

    return (
        <div className="p-6 space-y-4">
            <h1 className="text-2xl font-bold">{email.subject}</h1>
            <p className="text-muted-foreground">{email.summary}</p>
            <hr />
            <p className="whitespace-pre-wrap">{email.fullBody || 'Full body not stored yet.'}</p>
        </div>
    )
}

export default function EmailDetail({ params }: { params: { id: string } }) {
    const { id } = params
    const { data: session } = useSession()
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
        if (!session?.accessToken) return

        const fetchEmail = async () => {
            try {
                const res = await fetch(`/api/email?id=${encodeURIComponent(id)}`, {
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })

                const data = await res.json()
                setEmail(data)
            } catch (e) {
                console.error('Failed to fetch email', e)
            } finally {
                setLoading(false)
            }
        }

        fetchEmail()
    }, [id, session?.accessToken])

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
                                dangerouslySetInnerHTML={{ __html: email.bodyHtml || '<i>No HTML version available.</i>' }}
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
