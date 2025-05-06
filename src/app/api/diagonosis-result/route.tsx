import { NextRequest, NextResponse } from "next/server";
import { getDiagnosisResult } from "../utils/store";

export async function GET(request: NextRequest) {
  // URLからidパラメータを取得
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ message: "IDが必要です" }, { status: 400 });
  }

  // 診断結果をユーティリティを使って取得
  const result = getDiagnosisResult(id);

  if (!result) {
    return NextResponse.json(
      { message: "結果が見つかりません" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
