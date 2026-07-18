import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string" || !/^[A-Z0-9]+$/.test(name) || name.length > 12) {
      return NextResponse.json(
        { success: false, error: "이름은 12자 이하의 영문 대문자와 숫자만 가능합니다." },
        { status: 400 }
      );
    }

    // Insert into Supabase
    // secret_token is generated automatically by uuid_generate_v4() in the DB
    const { data, error } = await supabase
      .from("pets")
      .insert([{ name }])
      .select("name, secret_token, evolution_lvl, highest_score, total_score, inventory, stats")
      .single();

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json(
          { success: false, error: "이미 누군가 선점한 멋진 이름입니다. 다른 이름을 지어주세요!" },
          { status: 409 }
        );
      }
      console.error("Hatch error:", error);
      return NextResponse.json(
        { success: false, error: "알 부화 중 우주적 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, pet: data });
  } catch (error) {
    console.error("Hatch exception:", error);
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
}
