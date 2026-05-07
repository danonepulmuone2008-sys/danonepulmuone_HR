import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/client"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const userClient = createClient()
    const { data: { user } } = await userClient.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("image") as File
    if (!file) return NextResponse.json({ error: "이미지가 없습니다" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split(".").pop() ?? "jpg"
    const storagePath = `${user.id}/${Date.now()}.${ext}`

    const admin = createAdminClient()
    const { error: uploadError } = await admin.storage
      .from("receipts")
      .upload(storagePath, buffer, { contentType: file.type })
    if (uploadError) throw new Error(`Storage 업로드 실패: ${uploadError.message}`)

    return NextResponse.json({ storagePath })
  } catch (err) {
    console.error("[upload]", err)
    return NextResponse.json({ error: "업로드에 실패했습니다" }, { status: 500 })
  }
}
