import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const userId = formData.get("userId") as string | null

    if (!file || !userId) {
      return NextResponse.json({ error: "파일 또는 사용자 정보가 없습니다" }, { status: 400 })
    }

    const ext = file.name.split(".").pop() ?? "bin"
    const path = `${userId}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabaseAdmin.storage
      .from("vacation attach")
      .upload(path, buffer, { contentType: file.type })

    if (error) {
      console.error("[vacation upload]", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage
      .from("vacation attach")
      .getPublicUrl(path)

    return NextResponse.json({ url: data.publicUrl })
  } catch (err) {
    console.error("[vacation upload]", err)
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 })
  }
}
