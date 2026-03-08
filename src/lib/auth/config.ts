import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { authConfig } from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
            include: { firm: true },
          })
          if (!user) return null
          const isValid = await bcrypt.compare(credentials.password as string, user.passwordHash)
          if (!isValid) return null
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            firmId: user.firmId,
            firmName: user.firm.name,
            role: user.role,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.firmId = (user as any).firmId
        token.firmName = (user as any).firmName
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).firmId = token.firmId
        ;(session.user as any).firmName = token.firmName
        ;(session.user as any).role = token.role
      }
      return session
    },
  },
})
