import { cn } from "@/lib/utils";

const hashSeed = (seed: string) =>
    seed.split("").reduce((hash, char) => {
        const nextHash = (hash << 5) - hash + char.charCodeAt(0);
        return nextHash | 0;
    }, 0);

const createAvatarTheme = (seed: string) => {
    const hash = Math.abs(hashSeed(seed || "revise"));
    const hue = hash % 360;
    const secondaryHue = (hue + 80 + (hash % 90)) % 360;
    const accentHue = (hue + 190 + (hash % 45)) % 360;

    return {
        hash,
        pattern: hash % 4,
        background: [
            `hsl(${hue} 82% 56%)`,
            `hsl(${secondaryHue} 74% 46%)`,
            `hsl(${accentHue} 68% 18%)`,
        ],
    };
};

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
    const theme = createAvatarTheme(seed || name);
    const cells = Array.from({ length: 49 }, (_, index) => {
        const row = Math.floor(index / 7);
        const col = index % 7;
        const bit = (theme.hash >> (index % 24)) & 1;
        const diagonal = (row + col + theme.hash) % 3 === 0;
        const ring = Math.abs(row - 3) + Math.abs(col - 3) === 2;
        const stripe = theme.pattern % 2 === 0 ? row % 2 === theme.hash % 2 : col % 2 === theme.hash % 2;

        if (theme.pattern === 0) return bit === 1 || ring;
        if (theme.pattern === 1) return diagonal || bit === 1;
        if (theme.pattern === 2) return stripe || ring;
        return bit === 1 || (row === col) || (row + col === 6);
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
                background: `radial-gradient(circle at 24% 18%, ${theme.background[0]}, ${theme.background[1]} 52%, ${theme.background[2]})`,
            }}
        >
            <span
                className="absolute inset-0 opacity-75"
                style={{
                    background:
                        theme.pattern % 2 === 0
                            ? "linear-gradient(135deg, rgba(255,255,255,0.28), transparent 42%, rgba(0,0,0,0.18))"
                            : "radial-gradient(circle at 68% 32%, rgba(255,255,255,0.36), transparent 28%)",
                }}
            />
            {cells.map((isActive, index) => (
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
