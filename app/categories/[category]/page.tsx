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
export async function GET(
    req: NextRequest,
    { params }: { params: { category: string } }
) {
    try {
        const category = decodeURIComponent(params.category);
        console.log('🔍 Requested category:', category);

        const file = fs.readFileSync(dataPath, 'utf8');
        const parsed = JSON.parse(file);
        const emails = parsed.emails || [];

        const filtered = emails.filter((email: any) => {
            console.log('📧 Email category:', email.category);
            return email.category === category;
        });

        console.log(`✅ Found ${filtered.length} emails for ${category}`);

        return NextResponse.json({ emails: filtered });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: 'Failed to load emails' },
            { status: 500 }
        );
    }
}

export default function CategoryPage() {
    const { category } = useParams() as { category: string }

    const [emails, setEmails] = useState<Email[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!category) return;

        console.log('Fetching category:', category);

        fetch(`/api/email/category?name=${encodeURIComponent(category as string)}`)
            .then(res => res.json())
            .then(data => {
                console.log('Fetched emails:', data.emails);
                setEmails(data.emails || []);
                setLoading(false);
            });
    }, [category]);

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
            ) : emails.length === 0 ? (
                <p>No emails found in this category.</p>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {emails.map(email => (
                        <Link key={email.id} href={`/email/${email.id}`} className="block">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="rounded-xl border p-4 shadow-sm bg-card space-y-2 hover:bg-accent transition-colors"
                            >
                                <h2 className="font-semibold text-lg">{email.subject}</h2>
                                <p className="text-sm text-muted-foreground">{email.summary}</p>
                                <hr />
                                <p className="text-sm">{email.body}</p>
                            </motion.div>
                        </Link>
                    ))}

                </div>
            )}
        </main>
    )
}
