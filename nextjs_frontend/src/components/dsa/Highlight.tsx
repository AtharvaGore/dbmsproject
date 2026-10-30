// Renders a ts_headline snippet. Only <mark> and </mark> become elements;
// every other character is passed to React as text, so it is escaped.
// Owner: Bhooshan Deshpande (Member B)

export default function Highlight({ html }: { html: string }) {
  const parts = html.split(/(<mark>|<\/mark>)/);
  let marked = false;
  return (
    <>
      {parts.map((part, i) => {
        if (part === "<mark>") { marked = true; return null; }
        if (part === "</mark>") { marked = false; return null; }
        if (!part) return null;
        return marked
          ? <mark key={i} className="rounded bg-yellow-200 px-0.5">{part}</mark>
          : <span key={i}>{part}</span>;
      })}
    </>
  );
}
