declare module "*.css" {
  /** Bundled by esbuild's `text` loader — the raw stylesheet source. */
  const contents: string;
  export default contents;
}
