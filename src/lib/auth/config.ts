import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { authConfig } from "./auth.config"

// Dev-only mock accounts (used when DB is unavailable in local dev)
const DEV_ACCOUNTS = [
  { id: "dev-admin", email: "admin@lexagent.kr", password: "admin1234", name: "Admin", firmId: "dev-firm", firmName: "LexAgent Dev", role: "admin" },
  { id: "dev-jay", email: "hyunsoo@lexagent.kr", password: "lawyer1234", name: "Jay Park", firmId: "dev-firm", firmName: "LexAgent Dev", role: "lawyer" },
  { id: "dev-mina", email: "mina@lexagent.kr", password: "lawyer1234", name: "Mina Jung", firmId: "dev-firm", firmName: "LexAgent Dev", role: "lawyer" },
]

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
        } catch (e) {
          // DB unreachable — fall back to dev mock accounts in development only
          if (process.env.NODE_ENV === "development") {
            const mock = DEV_ACCOUNTS.find(
              (a) => a.email === credentials.email && a.password === credentials.password
            )
            if (mock) {
              console.warn("[auth] DB unavailable — using dev mock account:", mock.email)
              return { id: mock.id, email: mock.email, name: mock.name, firmId: mock.firmId, firmName: mock.firmName, role: mock.role }
            }
          }
          console.error("[auth] authorize error:", e)
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
