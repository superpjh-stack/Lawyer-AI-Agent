import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"
import { authRateLimit } from "@/lib/security/rate-limit"
import { safeValidate, RegisterSchema } from "@/lib/security/validation"

export async function POST(req: NextRequest) {
  try {
    // Rate limiting (brute-force protection)
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
    const { success: rateLimitOk, resetAt } = authRateLimit(ip);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    const body = await req.json()

    // Zod validation
    const validation = safeValidate(RegisterSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[0]?.message ?? '입력값이 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    const { name, email, password, firmName } = validation.data
    const { role } = body as { role?: string }
    const validRoles = ["admin", "lawyer", "member"]
    const userRole = validRoles.includes(role ?? '') ? role : "lawyer"

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const firm = await prisma.firm.create({
      data: {
        name: firmName || `${name} 법률사무소`,
      },
    })

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        firmId: firm.id,
        role: userRole as string,
      },
    })

    return NextResponse.json(
      { data: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
