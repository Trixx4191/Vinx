# Image assets

Homepage imagery lives in `public/images/home/`. Replace any file in place to
change the site — the paths below are the ones `src/app/page.tsx` references.

| File | Used for | Suggested dimensions |
| --- | --- | --- |
| `home/hero.jpg` | Full-bleed homepage hero | 2400 x 1600 px or larger, landscape |
| `home/editorial.jpg` | Homepage editorial portrait | 1200 x 1500 px or larger |
| `home/categories/category-01.jpg` | First category tile | 1200 x 1200 px or larger, square |
| `home/categories/category-02.jpg` | Second category tile | as above |
| `home/categories/category-03.jpg` | Third category tile | as above |
| `home/categories/category-04.jpg` | Fourth category tile | as above |

Category tiles follow the category names shown on the homepage, sorted
alphabetically; at most four are displayed. Tiles are cropped square and the
hero is cropped to a wide band, so keep the subject away from the edges.

**On file extensions.** These are `.jpg` because the files are JPEGs. An earlier
set carried `.webp` names while containing JPEG data — browsers sniff the actual
bytes so it rendered fine, but it made the filenames untrustworthy. If you
convert to real WebP or AVIF, rename both the file and its reference in
`page.tsx`. Next.js re-encodes and serves modern formats on the fly regardless,
so converting the source is optional.

**A missing file no longer breaks the layout.** `src/lib/publicAsset.ts` checks
that each image exists before rendering it; a tile whose photograph is absent
falls back to a plain ground and keeps its label. This is a safety net, not a
licence to leave files out — a blank tile is deliberate, but it is still blank.

## Product mockups

The homepage's "Quiet forms." cards show a mockup per category rather than the
individual product photograph, so the row reads as one set:

| File | Product type |
| --- | --- |
| `product-mockups/t-shirt.svg` | T-shirts |
| `product-mockups/hoodie.jpg` | Hoodies |
| `product-mockups/jacket.svg` | Jackets |
| `product-mockups/trousers.svg` | Pants |
| `product-mockups/cap.svg` | Accessories |

Replace a file in place to change that category's mockup. If you swap one for a
different format, update the path in `PRODUCT_MOCKUPS` in `src/app/page.tsx`.

Keep these light. The hoodie mockup was briefly a 778 KB PNG of exactly the same
photograph as a 123 KB JPEG sitting beside it — six times the weight for no
visible difference. Vector mockups are a few kilobytes; a photographic one
should be a JPEG.

## Product photography

Detail photos are not files in this repository. Each product's front, back,
gallery and hover video come from its catalog record and are managed in
`/admin/products`. In development, uploads land in `public/uploads/` (gitignored);
in production they go to your S3-compatible bucket. See the README's media
storage section.
