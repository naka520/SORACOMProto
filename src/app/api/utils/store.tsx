// src/app/api/utils/store.ts
// 診断結果を保存するためのグローバルストア

// 診断結果の型定義
export interface DiagnosisResult {
  isAppropriate: boolean;
  temperature: number;
  weather: string;
  recommendation: string;
}

// 診断結果を保存するためのグローバル変数（サーバー再起動時にリセットされる）
// 本番環境では永続的なストレージ（Redis、DynamoDBなど）を使用することをお勧めします
const diagnosisResults = new Map<string, DiagnosisResult>();

// 診断結果を保存する関数
export function saveDiagnosisResult(id: string, result: DiagnosisResult): void {
  diagnosisResults.set(id, result);
}

// 診断結果を取得する関数
export function getDiagnosisResult(id: string): DiagnosisResult | undefined {
  return diagnosisResults.get(id);
}
