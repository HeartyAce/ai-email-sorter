import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen justify-center items-center p-6">
      <Link
        href="/api/auth/signin"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg"
      >
        Sign in with Google
      </Link>
    </main>
  );
}
