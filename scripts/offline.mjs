import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const output = 'dist'
const files = (await readdir(output, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && !['sw.js', '.DS_Store'].includes(entry.name))
  .map(entry => relative(output, join(entry.parentPath, entry.name)).split(/[\\/]/).join('/'))
  .sort()
const hash = createHash('sha256')
hash.update(await readFile(new URL(import.meta.url)))
for (const file of files) {
  hash.update(file)
  hash.update(await readFile(join(output, file)))
}

await writeFile(join(output, 'sw.js'), `const cacheVersion = '${hash.digest('hex').slice(0, 16)}'
const files = ${JSON.stringify(files.map(file => './' + file))}
const scope = self.registration.scope
const cachePrefix = 'blingo:' + scope + ':'
const cacheName = cachePrefix + cacheVersion

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(files.map(file => new Request(file, { cache: 'reload' })))))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name.startsWith(cachePrefix) && name !== cacheName).map(name => caches.delete(name))
  )).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return
  event.respondWith((async () => {
    const cache = await caches.open(cacheName)
    const key = request.mode === 'navigate' ? new URL('index.html', scope).href : request
    const cached = await cache.match(key, { ignoreVary: true })
    if (!cached) return fetch(request)
    const range = request.headers.get('range')
    if (!range) return cached
    const bytes = await cached.arrayBuffer()
    const total = bytes.byteLength
    const match = /^bytes=(\\d*)-(\\d*)$/.exec(range)
    const first = match?.[1]
    const last = match?.[2]
    const start = first ? Number(first) : Math.max(0, total - Number(last))
    const end = first && last ? Math.min(total - 1, Number(last)) : total - 1
    if ((!first && !last) || !(start <= end)) {
      return new Response(null, { status: 416, headers: { 'Content-Range': 'bytes */' + total } })
    }
    return new Response(bytes.slice(start, end + 1), { status: 206, headers: {
      'Accept-Ranges': 'bytes',
      'Content-Type': cached.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Content-Length': String(end - start + 1)
    } })
  })())
})
`)
