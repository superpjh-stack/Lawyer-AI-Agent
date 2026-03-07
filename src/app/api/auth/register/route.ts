import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"

export async function POST(req: Request) {
  try {
    const { name, email, password, firmName } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "이름, 이메일, 비밀번호는 필수입니다." },
        { status: 400 }
      )
    }

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
        role: "admin",
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
