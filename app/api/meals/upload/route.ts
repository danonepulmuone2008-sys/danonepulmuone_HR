import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-server"

export async function POST(req: Request) {
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? ""
    if (!token) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "?몄쬆???꾩슂?⑸땲?? }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("image") as File
    if (!file) return NextResponse.json({ error: "?대?吏媛 ?놁뒿?덈떎" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.split(".").pop() ?? "jpg"
    const storagePath = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("receipts")
      .upload(storagePath, buffer, { contentType: file.type })
    if (uploadError) throw new Error(`Storage ?낅줈???ㅽ뙣: ${uploadError.message}`)

    return NextResponse.json({ storagePath })
  } catch (err) {
    console.error("[upload]", err)
    return NextResponse.json({ error: "?낅줈?쒖뿉 ?ㅽ뙣?덉뒿?덈떎" }, { status: 500 })
  }
}
