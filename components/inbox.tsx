'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState } from "react"

type Email = {
    id: string
    subject: string
    summary: string
    category: string
}

export default function Inbox({ emails }: { emails: Email[] }) {
    const [search, setSearch] = useState("")

    const filtered = emails.filter(
        email =>
            email.subject.toLowerCase().includes(search.toLowerCase()) ||
            email.summary.toLowerCase().includes(search.toLowerCase()) ||
            email.category.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">📬 Inbox Summary</h1>

            <Input
                placeholder="Search emails..."
                className="w-full"
                value={search}
                onChange={e => setSearch(e.target.value)}
            />

            <div className="space-y-4">
                {filtered.map((email) => (
                    <Card key={email.id}>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-lg font-semibold">{email.subject}</h2>
                                <Badge variant="outline">{email.category}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{email.summary}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
