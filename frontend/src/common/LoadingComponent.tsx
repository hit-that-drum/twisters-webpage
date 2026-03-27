type LoadingComponentProps = {
  size?: number;
  color?: string;
  speed?: number;
  className?: string;
};

const STAR_PATH =
  'M234.5,114.38l-45.1,39.36,13.51,58.6a16,16,0,0,1-23.84,17.34l-51.11-31-51,31a16,16,0,0,1-23.84-17.34L66.61,153.8,21.5,114.38a16,16,0,0,1,9.11-28.06l59.46-5.15,23.21-55.36a15.95,15.95,0,0,1,29.44,0h0L166,81.17l59.44,5.15a16,16,0,0,1,9.11,28.06Z';

const stars = [
  { scale: 1, offset: 0, delay: 0 },
  { scale: 0.72, offset: -10, delay: 0.18 },
  { scale: 0.52, offset: -8, delay: 0.36 },
];

const LOADING_KEYFRAME_NAME = 'loading-component-star-float';

export default function LoadingComponent({
  size = 100,
  color = '#ffd166',
  speed = 1.2,
  className = '',
}: LoadingComponentProps) {
  const resolvedSize = size > 0 ? size : 56;
  const resolvedSpeed = speed > 0 ? speed : 1.2;

  return (
    <>
      <style>
        {`
          @keyframes ${LOADING_KEYFRAME_NAME} {
            0% {
              opacity: 0;
              transform: translate3d(20px, 10px, 0) scale(0.9) rotate(0deg);
            }
            25% {
              opacity: 1;
            }
            100% {
              opacity: 0;
              transform: translate3d(0, -24px, 0) scale(1.08) rotate(180deg);
            }
          }
        `}
      </style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-6 py-10">
        <div
          className={['inline-flex items-end justify-center select-none', className]
            .filter(Boolean)
            .join(' ')}
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <span className="sr-only">Loading</span>

          {stars.map((star, index) => (
            <svg
              key={`${star.scale}-${star.delay}`}
              viewBox="0 0 256 256"
              width={resolvedSize * star.scale}
              height={resolvedSize * star.scale}
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              style={{
                marginLeft: index === 0 ? 0 : star.offset,
                willChange: 'transform, opacity',
                transform: 'translate3d(0, 0, 0)',
                animationName: LOADING_KEYFRAME_NAME,
                animationDuration: `${resolvedSpeed}s`,
                animationTimingFunction: 'ease-out',
                animationIterationCount: 'infinite',
                animationDelay: `${star.delay}s`,
                filter: `drop-shadow(0 2px 12px ${color})`,
                overflow: 'visible',
              }}
            >
              <path d={STAR_PATH} fill={color} />
            </svg>
          ))}
        </div>
      </div>
    </>
  );
}
