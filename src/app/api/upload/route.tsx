import { NextRequest, NextResponse } from "next/server";
import { env } from "process";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  console.log("=== アップロードAPI開始 ===");
  try {
    // フォームデータを取得
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    console.log("ファイル情報:", {
      exists: !!file,
      type: file?.type,
      size: file?.size,
    });

    if (!file) {
      return NextResponse.json(
        { message: "ファイルがアップロードされていません" },
        { status: 400 }
      );
    }

    // SORACOM API認証情報のチェック
    if (!env.SORACOM_AUTH_KEY || !env.SORACOM_AUTH_TOKEN) {
      console.error("SORACOM認証情報が見つかりません");
      return NextResponse.json(
        { message: "サーバー設定エラー: SORACOM認証情報が不足しています" },
        { status: 500 }
      );
    }

    const apiKey = env.SORACOM_AUTH_KEY;
    const token = env.SORACOM_AUTH_TOKEN;

    // ファイルをArrayBufferに変換
    const fileBuffer = await file.arrayBuffer();
    console.log("ファイルバッファ:", {
      byteLength: fileBuffer.byteLength,
    });

    const fileName = `private/sample/image.jpg`;
    console.log("ファイル名:", fileName);

    // SORACOM Harvest Fileにアップロード
    const uploadUrl = `https://api.soracom.io/v1/files/${fileName}`;
    console.log("アップロードURL:", uploadUrl);

    console.log("アップロード開始...");
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "X-Soracom-API-Key": apiKey,
        "X-Soracom-Token": token,
        "Content-Type": file.type || "image/jpeg",
      },
      body: Buffer.from(fileBuffer),
    });

    console.log("レスポンス受信:", {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      ok: uploadResponse.ok,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse
        .text()
        .catch(() => "レスポンステキスト取得エラー");
      console.error("アップロードエラー詳細:", {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        errorText,
      });

      return NextResponse.json(
        {
          message: "Harvest Fileへのアップロードに失敗しました",
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          errorDetails: errorText,
        },
        { status: 500 }
      );
    }

    console.log("アップロード成功!");

    // タグを設定
    const tags = {
      category: "clothes",
      type: file.type || "image/jpeg",
    };

    // ファイル名とタグを返す
    return NextResponse.json({
      fileName,
      tags,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error("未処理エラー:", error);
    return NextResponse.json(
      { message: `アップロードに失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}
