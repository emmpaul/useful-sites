import { z } from "zod"

const siteSchema = z.object({
  title: z.string().min(1),
  url: z.url({ protocol: /^https?$/ }),
  note: z.string().min(1),
})

const categorySchema = z.object({
  $schema: z.string().optional(),
  id: z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "must be a lowercase slug, e.g. `css-tools`"
    ),
  label: z.string().min(1),
  order: z.int().default(100),
  sites: z.array(siteSchema).min(1),
})

export type Site = z.infer<typeof siteSchema> & {
  /** `fontshare.com` — the url with the scheme and trailing slash stripped. */
  host: string
  category: string
}

export type Category = {
  id: string
  label: string
  order: number
  sites: Site[]
}

/**
 * Every category is one JSON file in `./sites/`. Drop a new file in that
 * directory and it shows up — nothing else to register. Files are read at
 * build time, so a malformed one fails loudly on the first load rather than
 * rendering a half-empty index.
 */
const files = import.meta.glob("./sites/*.json", {
  eager: true,
  import: "default",
})

function parseCategory(path: string, raw: unknown): Category {
  const result = categorySchema.safeParse(raw)

  if (!result.success) {
    throw new Error(
      `${path} is not a valid site category:\n${z.prettifyError(result.error)}`
    )
  }

  const { id, label, order, sites } = result.data

  return {
    id,
    label,
    order,
    sites: sites.map((site) => ({
      ...site,
      category: label,
      host: site.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    })),
  }
}

function assertNoDuplicates(categories: Category[]) {
  const seenIds = new Map<string, string>()
  const seenUrls = new Map<string, string>()

  for (const category of categories) {
    const clashingId = seenIds.get(category.id)
    if (clashingId) {
      throw new Error(
        `Duplicate category id "${category.id}" in ${clashingId} and ${category.label}`
      )
    }
    seenIds.set(category.id, category.label)

    for (const site of category.sites) {
      const clashingUrl = seenUrls.get(site.url)
      if (clashingUrl) {
        throw new Error(
          `${site.url} is listed twice — under ${clashingUrl} and ${category.label}`
        )
      }
      seenUrls.set(site.url, category.label)
    }
  }
}

export const categories: Category[] = Object.entries(files)
  .map(([path, raw]) => parseCategory(path, raw))
  .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))

assertNoDuplicates(categories)

export const sites: Site[] = categories.flatMap((category) => category.sites)
