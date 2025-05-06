import { NextRequest, NextResponse } from "next/server";
import { diagnosisResults } from "../flux-webhook/route";

export async function GET(request: NextRequest) {
  // URLからidパラメータを取得
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "IDが必要です" }, { status: 400 });
  }

  // 診断結果を取得
  const result = diagnosisResults.get(id);

  if (!result) {
    return NextResponse.json(
      { message: "結果が見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
