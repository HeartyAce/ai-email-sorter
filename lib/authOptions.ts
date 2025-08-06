// lib/authOptions.ts
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import type { Session } from 'next-auth'

export interface ExtendedToken extends JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
}

export interface ExtendedSession extends Session {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
}

export const authOptions: NextAuthOptions = {
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
    session: { strategy: 'jwt' },
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    accessTokenExpires: account.expires_at! * 1000,
                }
            }

            const extendedToken = token as ExtendedToken;
            if (extendedToken.accessTokenExpires && Date.now() < extendedToken.accessTokenExpires - 60 * 1000) {
                return extendedToken;
            }

            return {
                ...extendedToken,
                error: 'RefreshAccessTokenError',
            }
        },
        async session({ session, token }) {
            return {
                ...session,
                accessToken: token.accessToken as string,
                refreshToken: token.refreshToken as string,
                accessTokenExpires: token.accessTokenExpires as number,
                error: token.error,
            }
        },
    },
}
