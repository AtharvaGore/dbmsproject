"use client";

// "Topics" database (Table view only): per-topic progress from v_topic_progress.
// Owner: Bhooshan Deshpande (Member B)

import { Gauge, Hash, Table2, TriangleAlert } from "lucide-react";
import { DatabaseHeader, Tag, Td, Th, TitleIcon, border, hoverBg, text } from "./ui";
import type { TopicProgress as Row } from "./types";

export default function TopicProgress({ rows }: { rows: Row[] }) {
  return (
    <section>
      <DatabaseHeader title="Topics" views={[{ id: "table", label: "Table", icon: Table2 }]} view="table" onView={() => undefined} />
      {rows.length === 0 ? (
        <p className={`px-2 py-3 text-sm ${text.tertiary}`}>Tag problems with topics to see progress here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full min-w-[720px] border-collapse border-b ${border}`}>
            <thead className={`border-b ${border}`}>
              <tr>
                <Th icon={TitleIcon} className="w-[26%]">Topic</Th>
                <Th icon={Gauge}>Mastery</Th>
                <Th icon={Hash}>Problems</Th>
                <Th icon={Hash}>Mastered</Th>
                <Th icon={Hash}>To revisit</Th>
                <Th icon={TriangleAlert}>Failed in OA</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const mastery = r.problems ? Math.round((100 * r.mastered) / r.problems) : 0;
                return (
                  <tr key={r.topic_id} className={`border-b ${border} ${hoverBg}`}>
                    <Td><Tag label={r.topic} /></Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-24 overflow-hidden rounded-full bg-[#E9E9E7]">
                          <div className="h-full rounded-full bg-[#448361]" style={{ width: `${mastery}%` }} />
                        </div>
                        <span className={`text-xs tabular-nums ${text.secondary}`}>{mastery}%</span>
                      </div>
                    </Td>
                    <Td className="text-right tabular-nums">{r.problems}</Td>
                    <Td className="text-right tabular-nums">{r.mastered}</Td>
                    <Td className={`text-right tabular-nums ${r.revisit_needed >= 3 ? "font-semibold text-[#D9730D]" : ""}`}>{r.revisit_needed}</Td>
                    <Td className={`text-right tabular-nums ${r.failed_in_oa ? "text-[#E03E3E]" : ""}`}>{r.failed_in_oa}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
