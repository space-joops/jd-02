import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// 임시 진화 레시피 (레벨업 할수록 요구사항 증가)
const getEvolutionCost = (currentLvl: number) => {
  return {
    satellite: currentLvl * 2,
    can: currentLvl * 10,
    bolt: currentLvl * 5,
    spring: currentLvl * 5
  };
};

export async function POST(req: Request) {
  try {
    const { name, secret_token } = await req.json();

    if (!name || !secret_token) {
      return NextResponse.json({ success: false, error: "인증 정보가 없습니다." }, { status: 401 });
    }

    // 1. Fetch current pet
    const { data: pet, error: fetchError } = await supabase
      .from("pets")
      .select("*")
      .eq("name", name)
      .single();

    if (fetchError || !pet) {
      return NextResponse.json({ success: false, error: "펫을 찾을 수 없습니다." }, { status: 404 });
    }

    if (pet.secret_token !== secret_token) {
      return NextResponse.json({ success: false, error: "인증에 실패했습니다." }, { status: 403 });
    }

    const cost = getEvolutionCost(pet.evolution_lvl);
    const inv = pet.inventory || { satellite: 0, can: 0, bolt: 0, spring: 0 };

    // 2. Check if affordable
    if (
      (inv.satellite || 0) < cost.satellite ||
      (inv.can || 0) < cost.can ||
      (inv.bolt || 0) < cost.bolt ||
      (inv.spring || 0) < cost.spring
    ) {
      return NextResponse.json({ success: false, error: "진화에 필요한 쓰레기가 부족합니다." }, { status: 400 });
    }

    // 3. Deduct resources
    const newInventory = {
      ...inv,
      satellite: (inv.satellite || 0) - cost.satellite,
      can: (inv.can || 0) - cost.can,
      bolt: (inv.bolt || 0) - cost.bolt,
      spring: (inv.spring || 0) - cost.spring,
    };

    const newLevel = pet.evolution_lvl + 1;

    // 4. Update DB
    const { error: updateError } = await supabase
      .from("pets")
      .update({
        evolution_lvl: newLevel,
        inventory: newInventory
      })
      .eq("name", name);

    if (updateError) {
      console.error("Evolve update error:", updateError);
      return NextResponse.json({ success: false, error: "진화 처리 중 오류가 발생했습니다." }, { status: 500 });
    }

    return NextResponse.json({ success: true, new_level: newLevel, inventory: newInventory });

  } catch (error) {
    console.error("Evolve exception:", error);
    return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
}
