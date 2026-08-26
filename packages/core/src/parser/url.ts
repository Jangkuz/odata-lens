import { ODataUrl, ParseResult, Span, ResourcePath, QueryOption, Diagnostic } from '../ast'
import { parseResourcePath } from './path'
import { splitOptions, parseOption } from './options'
import { percentDecode } from '../source/decode'
import { detectDoubleEncoding } from './recover'

/**
 * Parse an OData V4 query URL (or just the query string).
 * Never throws; returns partial AST + diagnostics.
 *
 * Formats supported:
 * - Service root + path: https://host/svc/Orders(1)?$filter=...
 * - Just path: Orders(1)?$filter=...
 * - Just query: $filter=Status eq 'Open'&$select=ID,Name
 */
export function parse(input: string): ParseResult {
  const diagnostics: Diagnostic[] = []
  const trimmed = input.trim()

  // Empty input
  if (!trimmed) {
    return {
      ast: {
        kind: 'ODataUrl',
        serviceRoot: null,
        path: { kind: 'ResourcePath', span: { start: 0, end: 0 }, segments: [] },
        options: [],
        fragment: null,
        span: { start: 0, end: 0 },
      },
      diagnostics: [],
    }
  }

  // Split into components: serviceRoot, path, query, fragment
  const { serviceRoot, pathPart, queryPart, fragmentPart } = splitUrl(trimmed)

  const serviceRootLen = serviceRoot?.length ?? 0
  let pathSpan = { start: serviceRootLen, end: serviceRootLen + pathPart.length }
  let querySpan = { start: pathSpan.end + 1, end: pathSpan.end + 1 + queryPart.length }

  // Decode and parse the path
  const pathDecoded = percentDecode(pathPart)
  if (pathDecoded.doubleEncoded) {
    diagnostics.push(detectDoubleEncoding(pathDecoded.decoded, pathSpan) as any)
  }

  const pathSegments = parseResourcePath(pathDecoded.decoded)
  const path: ResourcePath = {
    kind: 'ResourcePath',
    segments: pathSegments,
    span: pathSpan,
  }

  // Decode and parse query options
  const queryDecoded = percentDecode(queryPart)
  if (queryDecoded.doubleEncoded) {
    diagnostics.push(detectDoubleEncoding(queryDecoded.decoded, querySpan) as any)
  }

  const parsedOptions = splitOptions(queryDecoded.decoded, querySpan.start)
  const options: QueryOption[] = []

  for (const parsed of parsedOptions) {
    const option = parseOption(parsed)
    if (option) {
      options.push(option)
    }
  }

  const ast: ODataUrl = {
    kind: 'ODataUrl',
    serviceRoot,
    path,
    options,
    fragment: fragmentPart,
    span: { start: 0, end: input.length },
  }

  return { ast, diagnostics }
}

/**
 * Split a URL into serviceRoot, path, query, fragment.
 * serviceRoot: everything up to and including the last / before a ? or # or end
 *            (typically https://host/svc/)
 * path: resource path (Orders(1), Orders(1)/Details, etc.)
 * query: everything after ? (and before #)
 * fragment: everything after #
 */
function splitUrl(input: string): { serviceRoot: string | null; pathPart: string; queryPart: string; fragmentPart: string | null } {
  // Extract fragment first
  const fragmentIdx = input.indexOf('#')
  const beforeFragment = fragmentIdx !== -1 ? input.slice(0, fragmentIdx) : input
  const fragmentPart = fragmentIdx !== -1 ? input.slice(fragmentIdx + 1) : null

  // Extract query
  const queryIdx = beforeFragment.indexOf('?')
  const beforeQuery = queryIdx !== -1 ? beforeFragment.slice(0, queryIdx) : beforeFragment
  const queryPart = queryIdx !== -1 ? beforeFragment.slice(queryIdx + 1) : ''

  // Split path into serviceRoot and path
  // Heuristic: if it starts with http(s)://, the serviceRoot is everything up to and including
  // the last / before any path segments that don't look like a service root
  // For simplicity: serviceRoot is protocol + host + path up to last / that includes 'http' or is followed by non-/
  let serviceRoot: string | null = null
  let pathPart = beforeQuery

  if (beforeQuery.startsWith('http://') || beforeQuery.startsWith('https://')) {
    // Find the last / that's part of the service root
    // Service root typically looks like: https://host/odata/v4/
    const match = beforeQuery.match(/^(https?:\/\/[^/]+(?:\/[^/()]+)*)\/(.*)$/)
    if (match) {
      serviceRoot = match[1] + '/'
      pathPart = match[2]
    }
  }

  return { serviceRoot, pathPart, queryPart, fragmentPart }
}
