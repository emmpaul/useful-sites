import { LineSidebar } from "@/components/line-sidebar"

type CategorySidebarProps = {
  /** Labels in display order — the first one is the "everything" entry. */
  items: string[]
  active: string
  onSelect: (label: string) => void
}

/**
 * The category list as a line menu pinned to the left margin. Hidden until the
 * pointer reaches that margin (or something inside it takes focus), so the
 * index keeps its own column to itself. Below `lg` there is no room for it —
 * the chips under the search field cover the same ground.
 */
export function CategorySidebar({
  items,
  active,
  onSelect,
}: CategorySidebarProps) {
  const activeIndex = items.indexOf(active)

  return (
    <div className="group fixed top-1/2 left-0 z-40 hidden -translate-y-1/2 py-6 pr-16 pl-5 lg:block">
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-5 flex -translate-y-1/2 flex-col gap-2.5 transition-opacity duration-300 group-focus-within:opacity-0 group-hover:opacity-0 motion-reduce:transition-none"
      >
        <span className="block h-px w-5 bg-dim" />
        <span className="block h-px w-3 bg-dim" />
        <span className="block h-px w-5 bg-dim" />
      </span>

      <div className="pointer-events-none -translate-x-2 opacity-0 transition duration-300 ease-out group-focus-within:pointer-events-auto group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none">
        <LineSidebar
          label="Categories"
          items={items}
          activeIndex={activeIndex === -1 ? null : activeIndex}
          onItemClick={(_, itemLabel) => onSelect(itemLabel)}
          markerLength={40}
          itemGap={16}
          fontSize={0.95}
          maxShift={14}
          proximityRadius={90}
        />
      </div>
    </div>
  )
}
