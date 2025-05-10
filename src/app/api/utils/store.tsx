// src/app/api/utils/store.ts
// 診断結果を保存するためのグローバルストア

// 診断結果の型定義
export interface DiagnosisResult {
  payload: string;
}

// 診断結果を保存するためのグローバル変数（サーバー再起動時にリセットされる）
// 本番環境では永続的なストレージ（Redis、DynamoDBなど）を使用することをお勧めします
const diagnosisResults = new Map<string, DiagnosisResult>();

// 診断結果を保存する関数
export function saveDiagnosisResult(payload: string): void {
  // UUIDの生成を削除
  const id = "static-id"; // 必要に応じて固定値や他の識別子を使用
  diagnosisResults.set(id, { payload });
}

// 診断結果を取得する関数
export function getDiagnosisResult(): DiagnosisResult | undefined {
  // IDが固定値の場合、直接取得
  return diagnosisResults.get("static-id");
}
