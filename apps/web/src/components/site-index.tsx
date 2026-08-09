import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

import { CategorySidebar } from "@/components/category-sidebar"
import { categories, sites, type Site } from "@/data/sites"

const ALL = "All"

type Group = {
  label: string
  sites: Array<Site & { num: string }>
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function matchesQuery(site: Site, query: string) {
  if (!query) {
    return true
  }

  return `${site.title} ${site.category} ${site.note} ${site.url}`
    .toLowerCase()
    .includes(query)
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      Boolean(
        target.closest("input, textarea, select, [contenteditable='true']")
      ))
  )
}

export function SiteIndex() {
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState(ALL)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCommandK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"
      const isSlash = event.key === "/" && !isEditableTarget(event.target)

      if (isCommandK || isSlash) {
        event.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const normalizedQuery = query.trim().toLowerCase()

  const groups = React.useMemo(() => {
    let num = 0

    return categories.reduce<Group[]>((accumulated, group) => {
      if (category !== ALL && category !== group.label) {
        return accumulated
      }

      const matches = group.sites
        .filter((site) => matchesQuery(site, normalizedQuery))
        .map((site) => {
          num += 1
          return { ...site, num: pad(num) }
        })

      if (matches.length === 0) {
        return accumulated
      }

      return [...accumulated, { label: group.label, sites: matches }]
    }, [])
  }, [category, normalizedQuery])

  const chips = [
    { label: ALL, count: sites.length },
    ...categories.map((group) => ({
      label: group.label,
      count: group.sites.length,
    })),
  ]

  return (
    <div className="min-h-svh bg-background bg-[radial-gradient(var(--faint)_1px,transparent_1px)] bg-[size:22px_22px] text-foreground">
      <CategorySidebar
        items={chips.map((chip) => chip.label)}
        active={category}
        onSelect={setCategory}
      />

      <div className="mx-auto flex max-w-[920px] flex-col gap-12 px-8 pt-18 pb-30">
        <header className="flex flex-col gap-[22px]">
          <div className="flex items-baseline justify-between gap-5 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            <span>Personal index</span>
            <span>{pad(sites.length)} entries</span>
          </div>
          <h1 className="text-[clamp(3rem,13vw,70px)] leading-[0.92] font-bold tracking-[-0.045em]">
            Useful
            <br />
            <span className="text-brand italic">sites</span>
          </h1>
          <div className="h-px bg-gradient-to-r from-border to-transparent" />
        </header>

        <div className="flex flex-col gap-[18px]">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <span className="font-mono text-[13px] text-brand">/</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("")
                  event.currentTarget.blur()
                }
              }}
              placeholder="filter the index…"
              aria-label="Filter the index"
              className="min-w-0 flex-1 border-none bg-transparent font-mono text-sm tracking-[-0.01em] outline-none placeholder:text-dim"
            />
            <span className="font-mono text-[11px] text-dim">⌘K</span>
          </div>

          {/* Below `lg` the sidebar has no room, so the chips are the only way
              to switch category; above it the sidebar takes over. */}
          <div className="flex flex-wrap gap-1.5 lg:hidden">
            {chips.map((chip) => {
              const active = category === chip.label

              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setCategory(chip.label)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-[6px] border px-3 py-1.5 font-mono text-[11px] tracking-[0.08em] uppercase transition-all",
                    active
                      ? "border-brand bg-brand text-background"
                      : "border-border bg-transparent text-muted-foreground hover:border-dim hover:text-foreground"
                  )}
                >
                  <span>{chip.label}</span>
                  <span className="opacity-50">{chip.count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-14">
          {groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-1">
              <div className="mb-3.5 flex items-baseline gap-4">
                <h2 className="text-[22px] font-medium tracking-[-0.025em] whitespace-nowrap italic">
                  {group.label}
                </h2>
                <div className="flex-1 -translate-y-1 border-b border-dashed border-border" />
                <span className="font-mono text-[11px] text-dim">
                  {pad(group.sites.length)}
                </span>
              </div>

              {group.sites.map((site) => (
                <a
                  key={site.url}
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className="-mx-3.5 grid grid-cols-[44px_1fr_auto] items-baseline gap-[18px] rounded-[4px] border-b border-faint py-4 pr-3.5 pl-2.5 transition-colors outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-mono text-[11px] text-dim">
                    {site.num}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex flex-wrap items-baseline gap-2.5">
                      <span className="text-[21px] leading-[1.15] font-semibold tracking-[-0.025em]">
                        {site.title}
                      </span>
                      <span className="font-mono text-[11px] text-dim">
                        {site.host}
                      </span>
                    </span>
                    <span className="text-[13.5px] leading-[1.6] text-pretty text-muted-foreground">
                      {site.note}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-brand">↗</span>
                </a>
              ))}
            </section>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="py-14 text-center font-mono text-[13px] text-dim">
            no matches — try a broader word
          </div>
        )}
      </div>
    </div>
  )
}
