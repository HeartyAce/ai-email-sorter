import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { JWT } from 'next-auth/jwt'
import type { Session } from 'next-auth'
import { authOptions } from '@/lib/authOptions'

interface ExtendedToken extends JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
}

interface ExtendedSession extends Session {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
}

async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
    try {
        const url = new URL('https://oauth2.googleapis.com/token')
        url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
        url.searchParams.set('client_secret', process.env.GOOGLE_CLIENT_SECRET!)
        url.searchParams.set('grant_type', 'refresh_token')
        url.searchParams.set('refresh_token', token.refreshToken!)

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })

        const refreshed = await response.json()

        if (!response.ok) {
            throw refreshed
        }

        console.log('🔁 Refreshed token', refreshed)

        return {
            ...token,
            accessToken: refreshed.access_token,
            accessTokenExpires: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
            refreshToken: refreshed.refresh_token ?? token.refreshToken,
            error: undefined,
        }
    } catch (error) {
        console.error('❌ Error refreshing access token', error)
        return {
            ...token,
            error: 'RefreshAccessTokenError',
        }
    }
}

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: [
                        'openid',
                        'profile',
                        'email',
                        'https://www.googleapis.com/auth/gmail.readonly',
                        'https://www.googleapis.com/auth/gmail.modify',
                    ].join(' '),
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                console.log('🔑 First login - account received')
                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    accessTokenExpires: account.expires_at! * 1000,
                }
            }

            if (token.accessTokenExpires && Date.now() < Number(token.accessTokenExpires) - 60 * 1000) {
                return token
            }

            console.log('🔄 Token expired – refreshing...')
            return await refreshAccessToken(token as ExtendedToken)
        },

        async session({ session, token }) {
            const customSession: ExtendedSession = {
                ...session,
                accessToken: token.accessToken as string,
                refreshToken: token.refreshToken as string,
                accessTokenExpires: token.accessTokenExpires as number,
            }

            if (token.error) customSession.error = token.error as string

            return customSession
        },
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
})
export { handler as GET, handler as POST }
