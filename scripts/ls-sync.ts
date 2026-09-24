// P5.02: `pnpm ls:sync` — pulls prices and activation limits from Lemon Squeezy into Sanity and the
// Postgres variant mirror. The Sanity webhook revalidates the affected PDPs. The admin "Sync prices"
// action runs the same function and revalidates directly.
import { syncVariantsFromLs } from '../src/server/catalog/variant-sync'

async function main() {
  const { lines, changedSlugs } = await syncVariantsFromLs()
  console.table(lines)
  const missing = lines.filter((l) => l.status === 'missing_in_ls')
  console.log(
    `\n${lines.length} variants checked · ${lines.filter((l) => l.status === 'updated').length} updated · ${missing.length} missing in LS`,
  )
  if (changedSlugs.length) console.log(`Changed products: ${changedSlugs.join(', ')}`)
  if (missing.length) {
    console.error(
      'Some Sanity licenses reference LS variants that do not exist in this store/mode. Fix the IDs in the Studio.',
    )
    process.exit(1)
  }
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
