"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Camera() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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

  // 写真を撮影
  const captureImage = () => {
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

    // キャンバスから画像データを取得
    const data = canvas.toDataURL("image/jpeg");
    setImageData(data);

    // カメラを停止
    stopCamera();
  };

  // 撮り直し
  const retakeImage = () => {
    setImageData(null);
    initCamera();
  };

  // 画像をS3にアップロードしてSORACOM Fluxを起動
  const handleDiagnose = async () => {
    if (!imageData) return;

    setLoading(true);
    try {
      // Base64データをBlobに変換
      const response = await fetch(imageData);
      const blob = await response.blob();

      // FormDataを作成してファイルを追加
      const formData = new FormData();
      formData.append("file", blob, "capture.jpg");

      // 1. S3にアップロード
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("アップロードに失敗しました");
      }

      const { imageUrl } = await uploadResponse.json();

      // 2. SORACOM Fluxにトリガー送信
      const triggerResponse = await fetch("/api/torriger-flux", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // 空のリクエストボディ
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
          {/* Next.jsのImage componentを使用 */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "400px",
              height: "300px",
            }}
          >
            <Image
              src={imageData}
              alt="撮影した服"
              fill
              style={{ objectFit: "contain" }}
              sizes="(max-width: 768px) 100vw, 400px"
              className="rounded-lg"
              priority
            />
          </div>
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
