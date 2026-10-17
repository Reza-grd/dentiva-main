/** Usulan adapter integrasi; tidak dipasang ke aplikasi. g HARUS berasal dari uid per instans. */
export function instansSvg(svg, g) {
  // Namespace seluruh id DAN url(#id), bukan hanya id gradien. Tanpa eval/skrip SVG.
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  for (const id of ids) {
    const key = id.replace('-INSTANCE-', '-');
    const unique = g(key);
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(unique)) throw new Error('ID instans tidak valid');
    svg = svg.replaceAll(`id="${id}"`, `id="${unique}"`).replaceAll(`url(#${id})`, `url(#${unique})`);
  }
  return svg;
}
