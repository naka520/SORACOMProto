import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// S3クライアントの初期化
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    // フォームデータを取得
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { message: "ファイルがアップロードされていません" },
        { status: 400 }
      );
    }

    // ファイルをArrayBufferに変換
    const fileBuffer = await file.arrayBuffer();

    // ユニークなファイル名を生成
    const fileName = `clothes/${Date.now()}-${uuidv4()}.${
      file.name.split(".").pop() || "jpg"
    }`;

    // S3にアップロード
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: fileName,
        Body: Buffer.from(fileBuffer),
        ContentType: file.type || "image/jpeg",
      })
    );

    // 画像のURLを生成して返す
    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("アップロードエラー:", error);
    return NextResponse.json(
      { message: "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}
