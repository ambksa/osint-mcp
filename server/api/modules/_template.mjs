/**
 * Module Template — copy this file to create a new OSINT module.
 *
 * File naming: <module_id>.mjs (e.g. my_feed.mjs → module ID = "my_feed")
 * Files starting with _ are ignored by the loader.
 *
 * Each module exports:
 *   name        — module ID (must match filename without .mjs)
 *   description — shown in module list and auto-generated MCP tool description
 *   run(ctx, params) — async function that fetches and returns data
 *
 * Available params (passed from MCP tools and headless API):
 *   params.query   — user search query (string)
 *   params.limit   — max results (number)
 *   params.bbox    — bounding box "south,west,north,east" (string)
 *   params.format  — "json" | "md" | "both"
 *   params.*       — any custom params your module needs
 *
 * ctx object:
 *   ctx.origin     — server origin URL
 *   ctx.fetchJson  — helper: fetchJson(origin, endpoint, params)
 *   ctx.fetchUrl   — helper: fetchJsonUrl(url, options)
 *
 * Return value: plain object with your data. Will be wrapped in the standard
 * headless response format automatically.
 *
 * EXAMPLE:
 */

export const name = '_template';
export const description = 'Template module — copy and rename to create new feeds';

export async function run(_ctx, _params) {
  return {
    message: 'This is a template. Copy this file and implement your feed.',
    timestamp: new Date().toISOString(),
  };
}
