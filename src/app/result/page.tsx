"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface DiagnosisResult {
  isAppropriate: boolean;
  temperature: number;
  weather: string;
  recommendation: string;
}

export default function Result() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchResult = async () => {
      try {
        const response = await fetch(`/api/diagnosis-result?id=${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            // 結果がまだない場合は再試行タイマーを続ける
            return;
          }
          throw new Error(`エラー: ${response.status}`);
        }

        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          setResult(data);
          setLoading(false);
          // 結果が取得できたらポーリングを停止
          return true;
        }
      } catch (error) {
        console.error("結果取得エラー:", error);
        setError("診断結果の取得中にエラーが発生しました。");
        setLoading(false);
        return true; // エラー時もポーリングを停止
      }
      return false;
    };

    // 初回実行
    fetchResult();

    // ポーリングで結果を取得（SORACOM Fluxの処理完了を待つ）
    const interval = setInterval(async () => {
      const done = await fetchResult();
      if (done) {
        clearInterval(interval);
      } else {
        // リトライ回数を更新
        setRetries(prev => prev + 1);

        // 30回（約60秒）経ってもデータがない場合はタイムアウト
        if (retries > 30) {
          setError("診断結果の取得がタイムアウトしました。");
          setLoading(false);
          clearInterval(interval);
        }
      }
    }, 2000); // 2秒ごとに確認

    return () => clearInterval(interval);
  }, [id, retries]);

  const handleRetry = () => {
    router.push("/camera");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-6">診断中...</h1>
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">SORACOM Fluxで診断中です</p>
          <p className="text-sm text-gray-500 mt-2">
            天気データと写真から最適な服装を判断しています
          </p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-red-600">エラー</h1>
          <p className="mb-6">{error || "診断結果が見つかりませんでした"}</p>
          <button
            onClick={handleRetry}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg w-full"
          >
            もう一度撮影する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-6">診断結果</h1>

      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div
          className={`text-xl font-bold mb-4 ${
            result.isAppropriate ? "text-green-600" : "text-red-600"
          }`}
        >
          {result.isAppropriate ? "適温です！" : "温度調節が必要です"}
        </div>

        <div className="mb-4">
          <p>現在の気温: {result.temperature}°C</p>
          <p>天気: {result.weather}</p>
        </div>

        <div className="mb-6">
          <h2 className="font-bold mb-2">アドバイス</h2>
          <p>{result.recommendation}</p>
        </div>

        <button
          onClick={() => router.push("/")}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg w-full"
        >
          もう一度診断する
        </button>
      </div>
    </div>
  );
}
