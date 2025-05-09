import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.json();
    const { fileName, tags } = body;
    if (!fileName) {
      return NextResponse.json(
        { message: "ファイル名が必要です" },
        { status: 400 }
      );
    }
    const fileUrl = `https://api.soracom.io/v1/files/${fileName}`;

    // 診断IDを生成
    const diagnosisId = uuidv4();

    // SORACOM FluxのIncoming Webhookにリクエストを送信
    const response = await fetch(process.env.SORACOM_FLUX_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        diagnosisId,
        content: {
          filePath: fileUrl, // Harvest Fileのファイルパス
          tags,
          callbackUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/flux-webhook`,
        },
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("SORACOM Flux呼び出しエラー:", errorData);
      throw new Error(
        `SORACOM Fluxの呼び出しに失敗しました: ${response.status}`
      );
    }

    // Incoming Webhookからのレスポンス
    const webhookResponse = await response.json();
    console.log("Webhook レスポンス:", webhookResponse);

    // 診断IDをクライアントに返す
    return NextResponse.json({ diagnosisId });
  } catch (error) {
    console.error("トリガーエラー:", error);
    return NextResponse.json(
      { message: "診断の開始に失敗しました" },
      { status: 500 }
    );
  }
}
