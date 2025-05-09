"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Camera() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);

  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // カメラの初期化
  const initCamera = async () => {
    try {
      if (!videoRef.current) return;

      // カメラへのアクセス許可を要求
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // 可能であれば背面カメラを使用
        audio: false,
      });

      // ビデオ要素にストリームを設定
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setCameraError(null);
    } catch (err) {
      console.error("カメラの初期化エラー:", err);
      setCameraError(
        "カメラにアクセスできませんでした。カメラの使用許可を確認してください。"
      );
    }
  };

  // カメラを停止
  const stopCamera = () => {
    if (!videoRef.current?.srcObject) return;

    const stream = videoRef.current.srcObject as MediaStream;
    const tracks = stream.getTracks();

    tracks.forEach(track => track.stop());
    videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  // コンポーネントがマウントされたときにカメラを初期化
  useEffect(() => {
    initCamera();

    // コンポーネントがアンマウントされたときにカメラを停止
    return () => {
      stopCamera();
    };
  }, []);

  // 画像を圧縮する関数
  const compressImage = async (
    base64Image: string,
    maxWidth = 640,
    quality = 0.7
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      // HTMLImageElement を使用（Next.jsのImageとの混同を避けるため）
      const img = document.createElement("img");

      img.onload = () => {
        // 元のアスペクト比を維持しながらリサイズ
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }

        // キャンバスにリサイズして描画
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context is not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 圧縮した画像をBase64で取得
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality);

        // 圧縮前後のサイズを計算（Base64文字列から推定）
        const originalSizeKB = Math.round((base64Image.length * 3) / 4) / 1024;
        const compressedSizeKB =
          Math.round((compressedBase64.length * 3) / 4) / 1024;

        setOriginalSize(originalSizeKB);
        setCompressedSize(compressedSizeKB);

        console.log(
          `圧縮: ${originalSizeKB.toFixed(2)}KB → ${compressedSizeKB.toFixed(
            2
          )}KB (${((compressedSizeKB / originalSizeKB) * 100).toFixed(1)}%)`
        );

        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = base64Image;
    });
  };

  // 写真を撮影して圧縮
  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // キャンバスのサイズをビデオのサイズに合わせる
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // ビデオの現在のフレームをキャンバスに描画
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // キャンバスから元の画像データを取得
    const originalData = canvas.toDataURL("image/jpeg", 1.0);

    try {
      // 画像を圧縮 (最大幅640px、品質60%)
      const compressedData = await compressImage(originalData, 640, 0.6);
      setImageData(compressedData);
    } catch (error) {
      console.error("画像圧縮エラー:", error);
      // エラー時は元の画像を使用
      setImageData(originalData);
    }

    // カメラを停止
    stopCamera();
  };

  // 撮り直し
  const retakeImage = () => {
    setImageData(null);
    setOriginalSize(0);
    setCompressedSize(0);
    initCamera();
  };

  // 画像をHarvest Fileにアップロードして診断開始
  const handleDiagnose = async () => {
    if (!imageData) return;

    setLoading(true);
    try {
      // Base64データをBlobに変換
      const response = await fetch(imageData);
      const blob = await response.blob();

      console.log(
        `アップロードする画像サイズ: ${(blob.size / 1024).toFixed(2)} KB`
      );

      // FormDataを作成してファイルを追加
      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");

      // 1. Harvest Fileにアップロード
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("アップロードに失敗しました");
      }

      const { fileName, tags } = await uploadResponse.json();

      // 2. SORACOM Fluxにトリガー送信
      const triggerResponse = await fetch("/api/trigger-flux", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName, tags }),
      });

      if (!triggerResponse.ok) {
        throw new Error("診断の開始に失敗しました");
      }

      const { diagnosisId } = await triggerResponse.json();

      // 3. 結果画面に遷移
      router.push(`/result?id=${diagnosisId}`);
    } catch (error) {
      console.error("診断エラー:", error);
      alert("診断に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-6">服を撮影してください</h1>

      {cameraError && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
          {cameraError}
        </div>
      )}

      {/* 撮影済み画像の表示 */}
      {imageData ? (
        <div className="mb-6">
          {/* 従来のimg要素を使用 */}
          <div className="w-full max-w-md overflow-hidden rounded-lg">
            <img
              src={imageData}
              alt="撮影した服"
              className="w-full object-contain"
              style={{ maxHeight: "300px" }}
            />
          </div>

          {/* 圧縮情報表示 */}
          {originalSize > 0 && compressedSize > 0 && (
            <div className="mt-2 text-sm text-gray-600 text-center">
              {originalSize.toFixed(1)}KB → {compressedSize.toFixed(1)}KB (
              {((compressedSize / originalSize) * 100).toFixed(0)}%)
            </div>
          )}

          <div className="flex mt-4 space-x-4">
            <button
              onClick={retakeImage}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg"
              disabled={loading}
            >
              撮り直す
            </button>
            <button
              onClick={handleDiagnose}
              className={`bg-blue-500 text-white px-6 py-2 rounded-lg ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={loading}
            >
              {loading ? "診断中..." : "診断する"}
            </button>
          </div>
        </div>
      ) : (
        // カメラプレビューと撮影ボタン
        <div className="mb-6">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-md h-auto"
              style={{ transform: "scaleX(-1)" }} // 自撮りの場合は鏡像表示
            />

            {cameraActive && (
              <button
                onClick={captureImage}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-4"
                aria-label="写真を撮影"
              >
                <div className="w-12 h-12 rounded-full border-4 border-blue-500"></div>
              </button>
            )}
          </div>

          {!cameraActive && !cameraError && (
            <div className="text-center mt-4">
              <button
                onClick={initCamera}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg"
              >
                カメラを起動する
              </button>
            </div>
          )}
        </div>
      )}

      {/* 画像データを取得するための非表示のキャンバス */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
