// An address the build needs from the environment (.env locally, project settings on Vercel). Node-safe: the build
// config imports it too.
export function requireUrl(name: string, value: string | undefined): string {
  const url = value?.trim().replace(/\/+$/, "")
  if (!url) throw new Error(`${name} is not set.`)
  if (!/^https?:\/\/\S+$/.test(url)) throw new Error(`${name} must be an http(s) address.`)
  return url
}

// A switch the build needs from the environment: exactly "true" or "false", never a default.
export function requireFlag(name: string, value: string | undefined): boolean {
  if (value === "true") return true
  if (value === "false") return false
  throw new Error(value ? `${name} must be "true" or "false".` : `${name} is not set.`)
}

// A Cognito user pool id, "<region>_<id>" (e.g. eu-central-1_AbC123).
export function requirePoolId(name: string, value: string | undefined): string {
  const id = value?.trim()
  if (!id) throw new Error(`${name} is not set.`)
  if (!/^[a-z]{2}(-[a-z]+)+-\d_[0-9A-Za-z]+$/.test(id)) throw new Error(`${name} must look like eu-central-1_AbC123.`)
  return id
}

// A Cognito app client id: letters and digits, at most 128.
export function requireClientId(name: string, value: string | undefined): string {
  const id = value?.trim()
  if (!id) throw new Error(`${name} is not set.`)
  if (!/^[0-9A-Za-z]{1,128}$/.test(id)) throw new Error(`${name} must be an app client id.`)
  return id
}
