import { useLayoutEffect, useState } from 'react';
import styled from 'styled-components';

const REFERENCE_WIDTH = 1920;
const REFERENCE_HEIGHT = 1080;
const AUTH_REFERENCE_HEIGHT = 900;
const MIN_SCALE = 0.7;
const AUTH_STAGE_WIDTH = 548;

let baselineDevicePixelRatio = 0;

const readViewport = () => {
  const dpr = window.devicePixelRatio || 1;
  if (!baselineDevicePixelRatio) baselineDevicePixelRatio = dpr;
  const zoom = dpr / baselineDevicePixelRatio;
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  return { width, height, baseWidth: width * zoom, baseHeight: height * zoom };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round2 = (value) => Math.round(value * 100) / 100;

const computeFit = (viewport, isPage, canvasWidth) => {
  const raw = isPage
    ? clamp(viewport.baseWidth / REFERENCE_WIDTH, MIN_SCALE, 1)
    : Math.min(
        clamp(viewport.baseHeight / AUTH_REFERENCE_HEIGHT, MIN_SCALE, 1),
        viewport.baseWidth / canvasWidth,
        1,
      );
  const scale = Math.floor(raw * 10000) / 10000;
  return {
    scale,
    width: round2(viewport.width / scale),
    height: round2(viewport.height / scale),
  };
};

const sameFit = (a, b) =>
  a.scale === b.scale &&
  Math.abs(a.width - b.width) < 0.5 &&
  Math.abs(a.height - b.height) < 0.5;

export const useIsDesktopFit = () => true;

const FitScaleLayout = ({
  children,
  compact = false,
  variant = 'auth',
  stageWidth,
}) => {
  const isPage = variant === 'page';
  const canvasWidth = stageWidth ?? AUTH_STAGE_WIDTH;
  const [fit, setFit] = useState(() =>
    computeFit(readViewport(), isPage, canvasWidth),
  );

  useLayoutEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const next = computeFit(readViewport(), isPage, canvasWidth);
      setFit((current) => (sameFit(current, next) ? current : next));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('resize', schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
    };
  }, [isPage, canvasWidth]);

  return (
    <PageShell>
      <Stage
        data-fit-stage=""
        style={{
          width: fit.width,
          height: fit.height,
          transform: `scale(${fit.scale})`,
          '--fit-height': `${fit.height}px`,
        }}
      >
        <ScrollPane $page={isPage}>
          {isPage ? (
            children
          ) : (
            <AuthFrame $compact={compact} $canvasWidth={canvasWidth}>
              {children}
            </AuthFrame>
          )}
        </ScrollPane>
      </Stage>
    </PageShell>
  );
};

const PageShell = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    var(--gradient-start) 0%,
    var(--gradient-mid) 50%,
    var(--gradient-end) 100%
  );
`;

const Stage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  transform-origin: top left;
  --fit-height: ${REFERENCE_HEIGHT}px;
`;

const ScrollPane = styled.div`
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: ${({ $page }) => ($page ? 'block' : 'flex')};
  flex-direction: column;
  align-items: center;
  justify-content: safe center;
`;

const AuthFrame = styled.div`
  position: relative;
  width: ${({ $canvasWidth }) => `${$canvasWidth}px`};
  flex-shrink: 0;
  padding: ${({ $compact }) => ($compact ? '72px 24px 16px' : '120px 24px 40px')};
`;

export default FitScaleLayout;
