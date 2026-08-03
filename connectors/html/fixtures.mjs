// Canned RAW (already-fetched HTML). Fixtures test the PURE half — materialize() — so
// they run with no network and no file access.
export const fixtures = [
  {
    name: 'identical element -> a deep-equals b (identity)',
    raw: { before: '<a role="link" class="cta" data-name="Get started">Get started</a>',
           after:  '<a role="link" class="cta" data-name="Get started">Get started</a>' },
    expect: { a: { role: 'link', tag: 'a', cls: 'cta', name: 'Get started', text: 'Get started' },
              b: { role: 'link', tag: 'a', cls: 'cta', name: 'Get started', text: 'Get started' } },
  },
  {
    name: 'locale relabel -> invariants (role/tag/cls) stable, surface (name/text) differ',
    raw: { before: '<a role="link" class="cta" data-name="Get started">Get started</a>',
           after:  '<a role="link" class="cta" data-name="Bắt đầu">Bắt đầu</a>' },
    expect: { a: { role: 'link', tag: 'a', cls: 'cta', name: 'Get started', text: 'Get started' },
              b: { role: 'link', tag: 'a', cls: 'cta', name: 'Bắt đầu', text: 'Bắt đầu' } },
  },
];
