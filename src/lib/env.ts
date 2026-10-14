// An address the build needs from the environment (.env locally, project settings on Vercel). Node-safe: the build
// config imports it too.
export function requireUrl(name: string, value: string | undefined): string {
  const url = value?.trim().replace(/\/+$/, "")
  if (!url) throw new Error(`${name} is not set.`)
  if (!/^https?:\/\/\S+$/.test(url)) throw new Error(`${name} must be an http(s) address.`)
  return url
}
