import { NextRequest, NextResponse } from "next/server";

// 診断結果の型定義
interface DiagnosisResult {
  isAppropriate: boolean;
  temperature: number;
  weather: string;
  recommendation: string;
}

// 診断結果を保存するためのグローバル変数（サーバー再起動時にリセットされる）
// 本番環境では永続的なストレージ（Redis、DynamoDBなど）を使用することをお勧めします
const diagnosisResults = new Map<string, DiagnosisResult>();

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

    // 診断結果を一時保存
    diagnosisResults.set(diagnosisId, result as DiagnosisResult);
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

// 診断結果を別のAPIルートからアクセスできるようにエクスポート
// この方法はNext.jsのApp Router環境で共有変数を扱う一つのアプローチです
export { diagnosisResults };
