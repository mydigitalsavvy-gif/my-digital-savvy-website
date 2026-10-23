import type { ThinkContent } from "@/types/home";
import { Crimson, Lines, RichText } from "@/components/ui/rich-text";

export function Think({ think }: { think: ThinkContent }) {
  return (
    <section className="wrap think" id="think" aria-labelledby="think-heading">
      <div className="think-grid reveal-group">
        <h2 id="think-heading" className="think-line">
          <Lines lines={think.headingLines} />
          <Crimson />
        </h2>
        <div className="think-body">
          {think.paragraphs.map((p, i) => (
            <p key={i}>
              <RichText value={p} />
            </p>
          ))}
          <p className="think-note">{think.note}</p>
        </div>
      </div>
    </section>
  );
}
