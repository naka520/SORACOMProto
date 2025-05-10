// src/app/api/utils/store.ts
// 診断結果を保存するためのグローバルストア

// 診断結果の型定義
export interface DiagnosisResult {
  output: {
    shindan: string;
    recommend: string;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
    model_id: string;
    byol: boolean;
    service: string;
    credit: number;
  };
}

// 診断結果を保存するためのグローバル変数（サーバー再起動時にリセットされる）
// 本番環境では永続的なストレージ（Redis、DynamoDBなど）を使用することをお勧めします
const diagnosisResults = new Map<string, DiagnosisResult>();

// 診断結果を保存する関数
export function saveDiagnosisResult(payload: DiagnosisResult): void {
  const id = "static-id"; // 固定のIDを使用
  diagnosisResults.set(id, payload); // JSON形式の診断結果を保存
}

// 診断結果を取得する関数
export function getDiagnosisResult(): DiagnosisResult | undefined {
  const id = "static-id"; // 固定のIDを使用
  return diagnosisResults.get(id); // 固定IDで診断結果を取得
}
