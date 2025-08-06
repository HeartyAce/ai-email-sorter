// app/dashboard/page.tsx (no 'use client')
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);

    if (!session) redirect('/');

    return <DashboardClient />;
}
