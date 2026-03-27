import { useRef, useState, useEffect, useCallback } from 'react';

// ── 상수 ──────────────────────────────────────────────────
const A4_RATIO = 210 / 297;                         // 세로 가이드 (위에서)
const SIDE_W_PCT  = 0.85;                            // 옆면 가이드 너비 비율
const SIDE_H_PCT  = 0.38;                            // 옆면 가이드 높이 비율
const SIDE_TOP_PCT = 0.30;                           // 옆면 가이드 상단 위치 비율

const API_BASE = (() => {
  const raw = import.meta.env.VITE_FOOT_API_URL ?? 'http://127.0.0.1:5000/measure';
  return raw.replace(/\/measure$/, '');
})();

// ── 타입 ──────────────────────────────────────────────────
interface TopResult {
  '발 길이 (cm)': number;
  '발 길이 (mm)': number;
  '발볼 너비 (cm)': number;
  '발볼 너비 (mm)': number;
  result_image?: string;
}

interface SideResult {
  arch_height_mm: number;
  arch_level: '평발' | '저아치' | '정상' | '높은 아치';
  arch_score: 0 | 1 | 2 | 3;
  result_image?: string;
}

type Step = 'top_capture' | 'top_result' | 'side_capture' | 'final_result';

// ── 추천 로직 ──────────────────────────────────────────────
function getRecommendation(top: TopResult, side: SideResult) {
  const lengthMm = top['발 길이 (mm)'];
  const ballMm   = top['발볼 너비 (mm)'];
  const ratio    = ballMm / lengthMm;

  // 신발 사이즈: 발 길이 + 10mm 여유, 5mm 단위 올림
  const shoeSize = Math.ceil((lengthMm + 10) / 5) * 5;

  const widthType =
    ratio < 0.37 ? '슬림' :
    ratio > 0.41 ? '와이드' : '보통';

  const widthDesc =
    widthType === '슬림'  ? 'D 폭 또는 슬림 핏' :
    widthType === '와이드' ? 'EE(2E) 이상 와이드 핏 추천' :
                            '표준 D 폭';

  const archGuide: Record<string, { shoeType: string; insole: string; note: string }> = {
    '평발':     { shoeType: '모션 컨트롤 슈즈', insole: '높은 아치 지지 인솔',  note: '발목 과내전 방지가 중요합니다' },
    '저아치':   { shoeType: '스태빌리티 슈즈',  insole: '미디엄 아치 지지 인솔', note: '아치 지지 보강을 권장합니다'   },
    '정상':     { shoeType: '뉴트럴 슈즈',      insole: '기본 쿠셔닝 인솔',      note: '대부분의 신발이 잘 맞습니다'   },
    '높은 아치': { shoeType: '쿠셔닝 슈즈',     insole: '충격 흡수 인솔',        note: '발바닥 충격 분산이 중요합니다' },
  };

  return { shoeSize, widthType, widthDesc, ...archGuide[side.arch_level] };
}

// ── 컴포넌트 ──────────────────────────────────────────────
export default function FootMeasurePage() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const analyzeRef = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  const [step,          setStep]          = useState<Step>('top_capture');
  const [streaming,     setStreaming]     = useState(false);
  const [paperDetected, setPaperDetected] = useState(false);
  const [footDetected,  setFootDetected]  = useState(false);
  const [topResult,      setTopResult]      = useState<TopResult | null>(null);
  const [sideResult,     setSideResult]     = useState<SideResult | null>(null);
  const [capturedImage,  setCapturedImage]  = useState<string | null>(null);
  const [topCaptured,    setTopCaptured]    = useState<string | null>(null); // 위에서 찍은 원본
  const [error,         setError]         = useState<string | null>(null);
  const [loading,       setLoading]       = useState(false);

  // ── 카메라 시작 ──
  const startCamera = useCallback(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreaming(true);
        }
      })
      .catch(() => setError('카메라 접근 권한이 필요합니다.'));
  }, []);

  useEffect(() => {
    startCamera();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // capturedImage 해제 시 비디오 스트림 재연결
  useEffect(() => {
    if (!capturedImage && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [capturedImage]);

  // ── 실시간 감지 루프 ──
  useEffect(() => {
    if (!streaming) return;
    if (step !== 'top_capture' && step !== 'side_capture') return;

    const interval = setInterval(() => {
      const video  = videoRef.current;
      const canvas = analyzeRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;

      const scale = 0.3;  // 0.2 → 0.3: 색상 정확도 향상
      const aw = Math.floor(video.videoWidth  * scale);
      const ah = Math.floor(video.videoHeight * scale);
      canvas.width  = aw;
      canvas.height = ah;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, aw, ah);

      if (step === 'top_capture') {
        // ── A4 용지 감지 (흰색 픽셀 비율) ──
        const gw = Math.floor(aw * 0.85);
        const gh = Math.floor(gw / A4_RATIO);
        const gx = Math.floor((aw - gw) / 2);
        const gy = Math.floor((ah - gh) / 2);
        if (gy < 0 || gx < 0) return;

        const data  = ctx.getImageData(gx, gy, gw, gh).data;
        let white   = 0;
        const total = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const minCh = Math.min(r, g, b);
          const maxCh = Math.max(r, g, b);
          // A4 용지 = 고명도(min>185) + 저채도(max-min<40, 색 치우침 없음)
          // 바닥 타일(베이지): min ~170 → 탈락 / A4: min ~200+ → 통과
          if (minCh > 185 && maxCh - minCh < 40) white++;
        }
        // 발이 가이드 70% 덮어도 A4 테두리 25%만 보이면 인식
        setPaperDetected(white / total > 0.25);

      } else {
        // ── 발 감지 (피부색 RGB) ──
        const gw = Math.floor(aw * SIDE_W_PCT);
        const gh = Math.floor(ah * SIDE_H_PCT);
        const gx = Math.floor((aw - gw) / 2);
        const gy = Math.floor(ah * SIDE_TOP_PCT);
        if (gy + gh > ah || gx < 0) return;

        const data  = ctx.getImageData(gx, gy, gw, gh).data;
        let skin    = 0;
        const total = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          if (r > 90 && g > 50 && b > 30 &&
              r > g  && r > b  &&
              Math.abs(r - g) > 15 &&
              r < 250 && g < 220 && b < 200) skin++;
        }
        setFootDetected(skin / total > 0.08);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [streaming, step]);

  // ── 촬영 핸들러 ──
  const handleCapture = useCallback(async (currentStep: Step) => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) { setError('카메라가 준비되지 않았습니다.'); return; }

    canvas.width  = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, vw, vh);

    const dw = video.clientWidth;
    const dh = video.clientHeight;
    const sx = vw / dw;
    const sy = vh / dh;

    let paper_x: number, paper_y: number, paper_w: number, paper_h: number;

    if (currentStep === 'top_capture') {
      const gDispW = dw * 0.85;
      const gDispH = gDispW / A4_RATIO;
      const gDispX = (dw - gDispW) / 2;
      const gDispY = (dh - gDispH) / 2;
      paper_x = Math.round(gDispX * sx);
      paper_y = Math.round(gDispY * sy);
      paper_w = Math.round(gDispW * sx);
      paper_h = Math.round(gDispH * sy);
    } else {
      const gDispW = dw * SIDE_W_PCT;
      const gDispH = dh * SIDE_H_PCT;
      const gDispX = (dw - gDispW) / 2;
      const gDispY = dh * SIDE_TOP_PCT;
      paper_x = Math.round(gDispX * sx);
      paper_y = Math.round(gDispY * sy);
      paper_w = Math.round(gDispW * sx);
      paper_h = Math.round(gDispH * sy);
    }

    const imageDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataUrl);
    setError(null);
    setLoading(true);

    try {
      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob((b) => b ? res(b) : rej(new Error('이미지 변환 실패')), 'image/jpeg', 0.9);
      });

      const fd = new FormData();
      fd.append('image',   blob, 'foot.jpg');
      fd.append('paper_x', String(paper_x));
      fd.append('paper_y', String(paper_y));
      fd.append('paper_w', String(paper_w));
      fd.append('paper_h', String(paper_h));

      const apiUrl = currentStep === 'top_capture'
        ? `${API_BASE}/measure`
        : `${API_BASE}/measure/side`;

      if (currentStep === 'side_capture' && topResult) {
        fd.append('foot_length_mm', String(topResult['발 길이 (mm)']));
      }

      const ctrl    = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 30000);
      const res     = await fetch(apiUrl, { method: 'POST', body: fd, signal: ctrl.signal });
      clearTimeout(timeout);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '측정 실패');

      if (currentStep === 'top_capture') {
        setTopResult(data);
        setTopCaptured(imageDataUrl);  // 위에서 찍은 사진 별도 보관
        setStep('top_result');
      } else {
        setSideResult(data);
        setStep('final_result');
      }
    } catch (e: any) {
      setError(e.name === 'AbortError' ? '요청 시간이 초과됐습니다.' : (e.message || '서버 오류'));
    } finally {
      setLoading(false);
    }
  }, [topResult]);

  // ── Step 전환 핸들러 ──
  const handleGoToSide = () => {
    setCapturedImage(null);
    setError(null);
    setFootDetected(false);
    setStep('side_capture');
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    } else {
      startCamera();
    }
  };

  const handleRetryTop = () => {
    setCapturedImage(null);
    setError(null);
    setPaperDetected(false);
    setStep('top_capture');
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    } else {
      startCamera();
    }
  };

  const handleRetrySide = () => {
    setCapturedImage(null);
    setError(null);
    setFootDetected(false);
    setStep('side_capture');
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    } else {
      startCamera();
    }
  };

  const handleReset = () => {
    setTopResult(null);
    setSideResult(null);
    setCapturedImage(null);
    setError(null);
    setPaperDetected(false);
    setFootDetected(false);
    setStep('top_capture');
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    } else {
      startCamera();
    }
  };

  // ── 파생 값 ──
  const isCapturing = step === 'top_capture' || step === 'side_capture';
  const canShoot    = step === 'top_capture' ? paperDetected : footDetected;
  const guideColor  = canShoot ? '#00ff00' : '#facc15';

  const stepLabel   = step === 'top_capture' || step === 'top_result' ? '1/2' : '2/2';
  const stepTitle   = step === 'top_capture' || step === 'top_result'
    ? '위에서 촬영 — 발 길이 / 발볼'
    : '옆에서 촬영 — 아치';

  const statusText  = step === 'top_capture'
    ? (paperDetected ? '✓ 용지 인식됨 — 맨발을 올리고 촬영하세요' : 'A4 용지 전체를 박스 안에 맞춰주세요')
    : (footDetected  ? '✓ 발 인식됨 — 촬영하세요' : '발 옆면을 가이드 박스 안에 맞춰주세요');

  // ── 렌더 ──────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', background: '#000', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* 헤더 */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#888', fontSize: 13 }}>{stepLabel}</span>
        <h2 style={{ color: '#fff', margin: 0, fontSize: 17, fontWeight: 'bold' }}>{stepTitle}</h2>
        <span style={{ width: 32 }} />
      </div>

      {/* ── 카메라 화면 (캡처 단계) ── */}
      {isCapturing && !capturedImage && (
        <>
          <div style={{ position: 'relative', width: '100%' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />

            {/* 상태 메시지 */}
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              color: guideColor, fontSize: 13, fontWeight: 'bold',
              textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              whiteSpace: 'nowrap', transition: 'color 0.3s', pointerEvents: 'none',
            }}>
              {statusText}
            </div>

            {/* ── 위에서 촬영 가이드 ── */}
            {step === 'top_capture' && (
              <div style={{
                position: 'absolute', top: '44%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '85%', aspectRatio: `${A4_RATIO}`,
                border: `2px solid ${guideColor}`,
                boxSizing: 'border-box', pointerEvents: 'none', transition: 'border-color 0.3s',
              }}>
                <span style={{ position: 'absolute', top: -20, left: 0, color: '#fff', fontSize: 11, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>A4 용지</span>
                {/* 중심선 */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 0, borderLeft: '2px dashed rgba(255,60,60,0.85)', pointerEvents: 'none' }} />
                <span style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 11, whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>두 번째 발가락</span>
                {/* 뒤꿈치 원 */}
                <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', width: 60, height: 40, background: 'rgba(0,200,220,0.55)', borderRadius: '50%', border: '2px solid rgba(0,220,240,0.9)' }} />
                <span style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 11, whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>발 뒤꿈치</span>
              </div>
            )}

            {/* ── 옆에서 촬영 가이드 ── */}
            {step === 'side_capture' && (
              <div style={{
                position: 'absolute',
                top:  `${SIDE_TOP_PCT * 100}%`,
                left: `${((1 - SIDE_W_PCT) / 2) * 100}%`,
                width: `${SIDE_W_PCT * 100}%`,
                height: `${SIDE_H_PCT * 100}%`,
                border: `2px solid ${guideColor}`,
                boxSizing: 'border-box', pointerEvents: 'none', transition: 'border-color 0.3s',
              }}>
                {/* 뒤꿈치 / 발끝 라벨 */}
                <span style={{ position: 'absolute', bottom: -22, left: 4, color: '#aaa', fontSize: 11, whiteSpace: 'nowrap' }}>← 뒤꿈치</span>
                <span style={{ position: 'absolute', bottom: -22, right: 4, color: '#aaa', fontSize: 11, whiteSpace: 'nowrap' }}>발끝 →</span>
                {/* 아치 위치 힌트 (바닥 기준선) */}
                <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: 0, borderBottom: '2px dashed rgba(255,180,0,0.7)' }} />
                <span style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,180,0,0.9)', fontSize: 10, whiteSpace: 'nowrap' }}>바닥 기준</span>
                {/* 안내 문구 */}
                <span style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', color: '#fff', fontSize: 11, whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>카메라를 발 높이에서 수평으로</span>
              </div>
            )}

            {/* 셔터 버튼 오버레이 */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
              padding: '24px 16px 20px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              opacity: canShoot ? 1 : 0,
              pointerEvents: canShoot ? 'auto' : 'none',
              transition: 'opacity 0.3s',
            }}>
              {step === 'top_capture' && (
                <p style={{ color: '#ccc', textAlign: 'center', fontSize: 13, margin: 0 }}>
                  맨발을 A4 용지 위에 올리고 뒤꿈치를 원에 맞춰주세요
                </p>
              )}
              {step === 'side_capture' && (
                <p style={{ color: '#ccc', textAlign: 'center', fontSize: 13, margin: 0 }}>
                  발 옆면 전체(뒤꿈치~발끝)가 박스 안에 들어오도록 맞춰주세요
                </p>
              )}
              {error && <p style={{ color: '#f87171', textAlign: 'center', margin: 0, fontSize: 13 }}>{error}</p>}
              <button
                onClick={() => handleCapture(step as 'top_capture' | 'side_capture')}
                disabled={loading}
                style={{
                  width: 70, height: 70, borderRadius: '50%',
                  background: '#fff', border: '4px solid #4dd',
                  cursor: 'pointer', fontSize: 24,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {loading ? '⏳' : '📷'}
              </button>
            </div>
          </div>

          <canvas ref={canvasRef}  style={{ display: 'none' }} />
          <canvas ref={analyzeRef} style={{ display: 'none' }} />
        </>
      )}

      {/* ── 로딩 / 결과 화면 (캡처 후) ── */}
      {capturedImage && (step === 'top_capture' || step === 'top_result' || step === 'side_capture') && (
        <div style={{ padding: 16 }}>
          <img
            src={
              step === 'top_result' && topResult?.result_image
                ? `data:image/jpeg;base64,${topResult.result_image}`
                : capturedImage
            }
            alt="측정 이미지"
            style={{ width: '100%', borderRadius: 8 }}
          />

          {loading && <p style={{ color: '#fff', textAlign: 'center', marginTop: 12 }}>분석 중...</p>}
          {error && <p style={{ color: '#f87171', textAlign: 'center', marginTop: 12 }}>{error}</p>}

          {/* Step 1 결과 */}
          {step === 'top_result' && topResult && !loading && (
            <>
              <div style={{ marginTop: 16, padding: 16, background: '#1a2e1a', borderRadius: 8, border: '1px solid #00cc44' }}>
                <h3 style={{ color: '#00cc44', margin: '0 0 12px' }}>위에서 측정 결과</h3>
                <p style={{ color: '#fff', margin: '6px 0' }}>
                  발 길이: <strong style={{ color: '#00cc44' }}>{topResult['발 길이 (cm)']}cm</strong>
                  <span style={{ color: '#aaa', fontSize: 12 }}> ({topResult['발 길이 (mm)']}mm)</span>
                </p>
                <p style={{ color: '#fff', margin: '6px 0' }}>
                  발볼 너비: <strong style={{ color: '#00cc44' }}>{topResult['발볼 너비 (cm)']}cm</strong>
                  <span style={{ color: '#aaa', fontSize: 12 }}> ({topResult['발볼 너비 (mm)']}mm)</span>
                </p>
              </div>

              <button
                onClick={handleGoToSide}
                style={{
                  display: 'block', width: '100%', marginTop: 12,
                  padding: '14px 0', background: '#0d4f8c',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 16, cursor: 'pointer', fontWeight: 'bold',
                }}
              >
                다음: 옆면 촬영 →
              </button>

              <button
                onClick={handleRetryTop}
                style={{
                  display: 'block', width: '100%', marginTop: 8,
                  padding: '12px 0', background: '#374151',
                  color: '#aaa', border: 'none', borderRadius: 8,
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                위에서 다시 측정
              </button>
            </>
          )}
        </div>
      )}

      {/* ── 최종 결과 화면 ── */}
      {step === 'final_result' && topResult && sideResult && (
        <div style={{ padding: 16 }}>
          {/* 두 장 사진 나란히 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#888', fontSize: 11, margin: '0 0 4px', textAlign: 'center' }}>위에서 — 발 길이/발볼</p>
              <img
                src={topResult.result_image
                  ? `data:image/jpeg;base64,${topResult.result_image}`
                  : (topCaptured ?? '')}
                alt="위에서 측정"
                style={{ width: '100%', borderRadius: 6, display: 'block' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#888', fontSize: 11, margin: '0 0 4px', textAlign: 'center' }}>옆에서 — 아치</p>
              <img
                src={sideResult.result_image
                  ? `data:image/jpeg;base64,${sideResult.result_image}`
                  : (capturedImage ?? '')}
                alt="아치 측정"
                style={{ width: '100%', borderRadius: 6, display: 'block' }}
              />
            </div>
          </div>

          {/* 측정 요약 카드 */}
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <MiniCard label="발 길이" value={`${topResult['발 길이 (cm)']}cm`} sub={`${topResult['발 길이 (mm)']}mm`} color="#00cc44" />
            <MiniCard label="발볼 너비" value={`${topResult['발볼 너비 (cm)']}cm`} sub={`${topResult['발볼 너비 (mm)']}mm`} color="#00cc44" />
            <MiniCard label="아치 높이" value={`${sideResult.arch_height_mm}mm`} sub={sideResult.arch_level} color="#ffb300" />
            <ArchBar score={sideResult.arch_score} level={sideResult.arch_level} />
          </div>

          {/* 신발 추천 */}
          <RecommendCard top={topResult} side={sideResult} />

          {/* 다시 측정 버튼 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={handleRetrySide} style={btnStyle('#374151')}>옆면 다시</button>
            <button onClick={handleReset}     style={btnStyle('#1e293b')}>처음부터</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────

function MiniCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: '#111827', borderRadius: 8, padding: '12px 14px', border: `1px solid ${color}33` }}>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color, fontSize: 20, fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#666', fontSize: 11 }}>{sub}</div>
    </div>
  );
}

function ArchBar({ score, level }: { score: number; level: string }) {
  const labels = ['평발', '저아치', '정상', '높은 아치'];
  const colors  = ['#ef4444', '#f97316', '#22c55e', '#3b82f6'];
  return (
    <div style={{ background: '#111827', borderRadius: 8, padding: '12px 14px', border: '1px solid #333' }}>
      <div style={{ color: '#888', fontSize: 11, marginBottom: 6 }}>아치 등급</div>
      <div style={{ display: 'flex', gap: 3 }}>
        {labels.map((l, i) => (
          <div key={l} style={{
            flex: 1, height: 6, borderRadius: 3,
            background: i <= score ? colors[score] : '#333',
            opacity: i === score ? 1 : i < score ? 0.4 : 0.2,
          }} />
        ))}
      </div>
      <div style={{ color: colors[score], fontSize: 12, marginTop: 4, fontWeight: 'bold' }}>{level}</div>
    </div>
  );
}

function RecommendCard({ top, side }: { top: TopResult; side: SideResult }) {
  const r = getRecommendation(top, side);
  return (
    <div style={{ marginTop: 12, padding: 16, background: '#0f172a', borderRadius: 8, border: '1px solid #1e40af' }}>
      <h3 style={{ color: '#60a5fa', margin: '0 0 12px', fontSize: 15 }}>👟 신발 추천</h3>
      <Row label="추천 사이즈"  value={`${r.shoeSize}mm (KR ${r.shoeSize})`} />
      <Row label="발볼 핏"      value={`${r.widthType} — ${r.widthDesc}`} />
      <Row label="신발 타입"    value={r.shoeType} />
      <Row label="인솔"         value={r.insole} />
      <div style={{ marginTop: 10, padding: '8px 12px', background: '#1e293b', borderRadius: 6, color: '#94a3b8', fontSize: 12 }}>
        💡 {r.note}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 0', borderBottom: '1px solid #1e293b' }}>
      <span style={{ color: '#64748b', fontSize: 13, minWidth: 70 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontSize: 13, textAlign: 'right', flex: 1, marginLeft: 8 }}>{value}</span>
    </div>
  );
}

function btnStyle(bg: string) {
  return {
    flex: 1, padding: '12px 0', background: bg,
    color: '#fff' as const, border: 'none', borderRadius: 8,
    fontSize: 14, cursor: 'pointer' as const,
  };
}
