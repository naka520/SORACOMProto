import { NextRequest, NextResponse } from "next/server";
import { saveDiagnosisResult, DiagnosisResult } from "../utils/store";

export async function POST(request: NextRequest) {
  try {
    // FLUXからのWebhookデータを取得
    const body = await request.json();
    console.log("SORACOM Fluxからのwebhookを受信:", body);

    const { diagnosisId, result } = body;

    if (!diagnosisId || !result) {
      return NextResponse.json(
        { message: "無効なリクエストボディ" },
        { status: 400 }
      );
    }

    // 診断結果を保存ユーティリティを使って保存
    saveDiagnosisResult(diagnosisId, result as DiagnosisResult);
    console.log(`診断結果を保存しました(ID: ${diagnosisId})`);

    // Flux側に成功レスポンスを返す
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhookエラー:", error);
    return NextResponse.json(
      { message: "Webhookの処理に失敗しました" },
      { status: 500 }
    );
  }
}
