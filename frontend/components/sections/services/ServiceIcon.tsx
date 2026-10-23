import type { ServiceIcon as ServiceIconData } from "@/types/home";

/** The reference's hand-drawn service marks, rebuilt from structured shapes. */
export function ServiceIcon({ icon }: { icon: ServiceIconData }) {
  return (
    <svg className="wd-mark" viewBox="0 0 120 120" aria-hidden="true">
      {icon.shapes.map((s, i) => {
        const className = s.fill ? "fill" : undefined;
        switch (s.type) {
          case "rect":
            return (
              <rect
                key={i}
                className={className}
                x={s.x}
                y={s.y}
                width={s.width}
                height={s.height}
                rx={s.rx}
                transform={s.transform}
              />
            );
          case "circle":
            return (
              <circle
                key={i}
                className={className}
                cx={s.cx}
                cy={s.cy}
                r={s.r}
              />
            );
          case "path":
            return (
              <path
                key={i}
                className={className}
                d={s.d}
                strokeLinecap={s.strokeLinecap}
                strokeLinejoin={s.strokeLinejoin}
              />
            );
        }
      })}
    </svg>
  );
}
