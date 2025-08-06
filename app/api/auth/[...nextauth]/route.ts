import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import type { Session } from 'next-auth'

// Extend JWT with Google tokens
interface ExtendedToken extends JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
}

// Extend session to include Google tokens
interface ExtendedSession extends Session {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
}

// Token refresh helper
async function refreshAccessToken(token: ExtendedToken): Promise<ExtendedToken> {
    try {
        const url = new URL('https://oauth2.googleapis.com/token')
        url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
        url.searchParams.set('client_secret', process.env.GOOGLE_CLIENT_SECRET!)
        url.searchParams.set('grant_type', 'refresh_token')
        url.searchParams.set('refresh_token', token.refreshToken!)

        const res = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })

        const refreshedTokens = await res.json()

        if (!res.ok) throw refreshedTokens

        console.log('🔁 Token refreshed:', refreshedTokens)

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + (refreshedTokens.expires_in ?? 3600) * 1000,
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        }
    } catch (error) {
        console.error('❌ Error refreshing access token:', error)
        return { ...token, error: 'RefreshAccessTokenError' }
    }
}

// DO NOT export this directly
const authOptions: NextAuthOptions = {
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
    session: {
        strategy: 'jwt',
    },
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                console.log('🔐 First time login')
                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    accessTokenExpires: account.expires_at! * 1000,
                }
            }

            if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60 * 1000) {
                return token
            }

            console.log('🔄 Access token expired, refreshing...')
            return await refreshAccessToken(token as ExtendedToken)
        },
        async session({ session, token }) {
            const extendedSession: ExtendedSession = {
                ...session,
                accessToken: token.accessToken,
                refreshToken: token.refreshToken,
                accessTokenExpires: token.accessTokenExpires,
            }

            if (token.error) extendedSession.error = token.error

            return extendedSession
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        // signIn: '/auth/signin',
    },
}

// ✅ Only export GET and POST handlers
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
