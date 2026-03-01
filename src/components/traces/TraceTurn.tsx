import type { TraceTurn as TraceTurnType } from "@/lib/trace-types";
import { TraceTextBlock } from "./TraceTextBlock";
import { TraceThinkingBlock } from "./TraceThinkingBlock";
import { TraceToolCall } from "./TraceToolCall";

export function TraceTurn({ turn }: { turn: TraceTurnType }) {
  return (
    <div className="relative pl-4 border-l-2 border-border">
      <div className="absolute -left-[9px] top-0 size-4 rounded-full bg-background border-2 border-border" />
      <div className="text-[10px] text-muted-foreground font-mono mb-2">
        Turn {turn.index + 1}
      </div>
      <div className="space-y-2">
        {turn.blocks.map((block, i) => {
          if (block.type === "text") {
            return <TraceTextBlock key={i} text={block.text} />;
          }
          if (block.type === "thinking") {
            return <TraceThinkingBlock key={i} text={block.text} />;
          }
          if (block.type === "tool_call") {
            return <TraceToolCall key={i} call={block.call} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
