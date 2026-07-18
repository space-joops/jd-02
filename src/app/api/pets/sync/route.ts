import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { name, secret_token, run_score, eaten_junk } = await req.json();

    if (!name || !secret_token) {
      return NextResponse.json({ success: false, error: "인증 정보가 없습니다." }, { status: 401 });
    }

    // 1. Fetch current pet data to verify token and get current scores/inventory
    const { data: pet, error: fetchError } = await supabase
      .from("pets")
      .select("*")
      .eq("name", name)
      .single();

    if (fetchError || !pet) {
      return NextResponse.json({ success: false, error: "펫을 찾을 수 없습니다." }, { status: 404 });
    }

    if (pet.secret_token !== secret_token) {
      return NextResponse.json({ success: false, error: "인증에 실패했습니다. (잘못된 접근)" }, { status: 403 });
    }

    // 2. Calculate new values
    const newHighestScore = Math.max(pet.highest_score, run_score || 0);
    const newTotalScore = pet.total_score + (run_score || 0);
    
    const currentInventory = pet.inventory || { satellite: 0, can: 0, bolt: 0, spring: 0 };
    const newInventory = { ...currentInventory };
    
    if (eaten_junk) {
      for (const [key, value] of Object.entries(eaten_junk)) {
        if (typeof value === 'number') {
          newInventory[key] = (newInventory[key] || 0) + value;
        }
      }
    }

    // 3. Update the database
    const { error: updateError } = await supabase
      .from("pets")
      .update({
        highest_score: newHighestScore,
        total_score: newTotalScore,
        inventory: newInventory,
        last_played: new Date().toISOString()
      })
      .eq("name", name);

    if (updateError) {
      console.error("Sync update error:", updateError);
      return NextResponse.json({ success: false, error: "데이터 동기화 실패" }, { status: 500 });
    }

    // 4. Calculate Ranks (Optional: Can be heavy if table is huge, but fine for MVP)
    // Rank by highest_score
    const { count: highestRankCount } = await supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .gt("highest_score", newHighestScore);
      
    // Rank by total_score
    const { count: totalRankCount } = await supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .gt("total_score", newTotalScore);

    const highestScoreRank = (highestRankCount || 0) + 1;
    const totalScoreRank = (totalRankCount || 0) + 1;

    return NextResponse.json({
      success: true,
      inventory: newInventory,
      highest_score_rank: highestScoreRank,
      total_score_rank: totalScoreRank,
      pet: {
        highest_score: newHighestScore,
        total_score: newTotalScore
      }
    });

  } catch (error) {
    console.error("Sync exception:", error);
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
}
