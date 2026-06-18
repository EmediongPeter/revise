import { cn } from "@/lib/utils";

const palettes = [
    ["#22c55e", "#16a34a", "#052e16"],
    ["#38bdf8", "#2563eb", "#0f172a"],
    ["#f97316", "#d97757", "#431407"],
    ["#a78bfa", "#7c3aed", "#1e1b4b"],
    ["#f43f5e", "#db2777", "#4c0519"],
    ["#14b8a6", "#0f766e", "#042f2e"],
];

const hashSeed = (seed: string) =>
    seed.split("").reduce((hash, char) => {
        const nextHash = (hash << 5) - hash + char.charCodeAt(0);
        return nextHash | 0;
    }, 0);

const WorkspaceAvatar = ({
    seed,
    name,
    size = "md",
    className,
}: {
    seed: string;
    name: string;
    size?: "sm" | "md";
    className?: string;
}) => {
    const hash = Math.abs(hashSeed(seed || name || "revise"));
    const palette = palettes[hash % palettes.length];
    const activeDots = Array.from({ length: 49 }, (_, index) => {
        const bit = (hash >> (index % 24)) & 1;
        const row = Math.floor(index / 7);
        const col = index % 7;
        const distance = Math.abs(row - 3) + Math.abs(col - 3);

        return bit === 1 || distance < 2 || (index + hash) % 5 === 0;
    });

    return (
        <span
            aria-label={`${name} workspace`}
            className={cn(
                "relative grid shrink-0 grid-cols-7 place-items-center overflow-hidden rounded-full p-[5px] shadow-[var(--shadow-soft-sm)]",
                size === "sm" ? "size-8" : "size-9",
                className,
            )}
            style={{
                background: `radial-gradient(circle at 30% 25%, ${palette[0]}, ${palette[1]} 54%, ${palette[2]})`,
            }}
        >
            <span className="absolute inset-0 bg-[radial-gradient(circle_at_38%_20%,rgba(255,255,255,0.42),transparent_34%)]" />
            {activeDots.map((isActive, index) => (
                <span
                    key={`${seed}-${index}`}
                    className={cn(
                        "relative z-10 rounded-full bg-white transition-opacity",
                        size === "sm" ? "size-[2.5px]" : "size-[3px]",
                        isActive ? "opacity-90" : "opacity-20",
                    )}
                />
            ))}
        </span>
    );
};

export default WorkspaceAvatar;
