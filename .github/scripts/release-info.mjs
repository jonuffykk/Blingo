import { strict as assert } from 'node:assert'
import { appendFile, readFile, writeFile } from 'node:fs/promises'

const [destination] = process.argv.slice(2)
assert(destination, 'Provide a destination for the release notes.')

const [packageJson, packageLock, cargo, cargoLock, changelog] = await Promise.all(
  ['package.json', 'package-lock.json', 'desktop/Cargo.toml', 'desktop/Cargo.lock', 'CHANGELOG.md']
    .map(path => readFile(path, 'utf8')),
)
const { version } = JSON.parse(packageJson)
const lock = JSON.parse(packageLock)
const cargoPackage = cargo.match(/^\[package\][ \t]*\r?\n([^[]*)/m)?.[1]
const cargoLockPackage = cargoLock.split(/^\[\[package\]\]/m)
  .find(section => /^name = "blingo"\r?$/m.test(section))
const declaredVersion = section => section?.match(/^version = "([^"]+)"\r?$/m)?.[1]

assert.match(version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, 'Expected a stable package version.')
assert.equal(lock.version, version, 'package-lock.json version must match package.json.')
assert.equal(lock.packages?.['']?.version, version, 'package-lock.json root package must match package.json.')
assert.equal(declaredVersion(cargoPackage), version, 'desktop/Cargo.toml version must match package.json.')
assert.equal(declaredVersion(cargoLockPackage), version, 'desktop/Cargo.lock version must match package.json.')

const entries = changelog.split(/(?=^##[ \t])/m)
  .map(section => section.split(/\r?\n/))
  .filter(([heading]) => heading.match(/^##[ \t]+\[([^\]]+)\](?:[ \t]+-.*)?[ \t]*$/)?.[1] === version)
assert.equal(entries.length, 1, `Add a single "## [${version}] - YYYY-MM-DD" section to CHANGELOG.md.`)
const notes = entries[0].slice(1).join('\n').trim()
assert(notes, `CHANGELOG.md must include release notes for ${version}.`)
await writeFile(destination, notes + '\n', 'utf8')
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `version=${version}\n`, 'utf8')
