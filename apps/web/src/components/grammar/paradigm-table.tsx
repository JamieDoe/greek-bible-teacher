import type { GrammarParadigm } from "@gbt/shared";
import { IconArrowRight } from "@/components/icons";

/** "ἀρχ[ῇ]" → ἀρχ + a highlighted ῇ: the bracketed part is what changed. */
function MarkedForm({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/).map((part, i) =>
        part.startsWith("[") ? (
          <span key={i} className="rounded-[4px] bg-accent px-0.5 text-primary">
            {part.slice(1, -1)}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** A before/after table of forms (design "04 · Grammar lesson"). */
export function ParadigmTable({ paradigm }: { paradigm: GrammarParadigm }) {
  return (
    <div className="mt-5 rounded-2xl bg-card p-[18px] shadow-card">
      <table className="w-full table-fixed">
        <thead>
          <tr className="font-mono text-[11px] font-medium tracking-[0.08em] uppercase">
            <th className="pb-2 text-left font-medium text-muted-foreground">{paradigm.from}</th>
            <th className="w-8" aria-hidden="true" />
            <th className="pb-2 text-left font-medium text-primary">{paradigm.to}</th>
          </tr>
        </thead>
        <tbody lang="grc" className="font-greek text-2xl">
          {paradigm.rows.map((row) => (
            <tr key={row.from} className="h-14 border-t border-border">
              <td className="text-ink-2">{row.from}</td>
              <td className="text-muted-foreground" aria-label="becomes">
                <IconArrowRight size={18} strokeWidth={1.75} />
              </td>
              <td>
                <MarkedForm text={row.to} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {paradigm.note && (
        <p className="mt-2.5 text-sm leading-[1.45] text-muted-foreground">{paradigm.note}</p>
      )}
    </div>
  );
}
