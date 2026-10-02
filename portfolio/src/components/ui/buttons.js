// Shared button looks. Every hover effect has the same :focus-visible twin.
const base =
  "group/link inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-300 ease-[var(--ease-snap)] active:scale-[0.97]";

export const btnPrimary =
  `${base} h-12 bg-amber px-6 text-sm text-night-950 shadow-[0_12px_32px_-14px_rgb(255_179_71/0.75)] ` +
  "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgb(255_179_71/0.95)] focus-visible:-translate-y-0.5 focus-visible:shadow-[0_18px_40px_-14px_rgb(255_179_71/0.95)]";

export const btnSecondary =
  `${base} h-12 border border-line px-6 text-sm text-cream ` +
  "hover:-translate-y-0.5 hover:border-amber hover:text-amber focus-visible:-translate-y-0.5 focus-visible:border-amber focus-visible:text-amber";

export const btnSmallPrimary =
  `${base} h-10 bg-amber px-4 text-sm text-night-950 hover:bg-[#ffc56b] focus-visible:bg-[#ffc56b]`;

export const btnSmallSecondary =
  `${base} relative z-10 h-10 border border-line px-4 text-sm text-cream hover:border-amber hover:text-amber focus-visible:border-amber focus-visible:text-amber`;
