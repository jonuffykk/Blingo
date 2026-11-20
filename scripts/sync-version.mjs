import { readFile, writeFile } from 'node:fs/promises'

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) ||
    version.split('.').some(part => Number(part) > 65535)) {
  throw new Error('Use uma versão estável no formato MAJOR.MINOR.PATCH (cada parte até 65535).')
}

const targets = [
  ['../desktop/Cargo.toml', /(\[package\]\r?\nname = "blingo"\r?\nversion = ")[^"]+(")/],
  ['../desktop/Cargo.lock', /(\[\[package\]\]\r?\nname = "blingo"\r?\nversion = ")[^"]+(")/],
]

const updates = await Promise.all(targets.map(async ([path, pattern]) => {
  const file = new URL(path, import.meta.url)
  const source = await readFile(file, 'utf8')
  if (!pattern.test(source)) throw new Error(`Versão do Blingo não encontrada em ${path}.`)
  return { file, contents: source.replace(pattern, (_, prefix, suffix) => prefix + version + suffix) }
}))

await Promise.all(updates.map(({ file, contents }) => writeFile(file, contents)))
