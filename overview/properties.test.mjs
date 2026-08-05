// The Presentation Properties Test — Phase E.1 (the first step of Phase E; see docs/adr/0004). Not a new law:
// it applies the property-test pattern (docs/validation-pattern.md) to the Presentation subsystem, the same
// LAW → minimal synthetic → property → counter-example shape Decision and Analytics already use. It is the
// pattern's THIRD independent instance — Application, not Discovery.
//
// Division of labour, on purpose (do not merge):
//   overview.test.mjs   — the ADR-0003 ACCEPTANCE proofs (points): the shell imports nothing (Consumes), a card
//                         is verbatim, labels are escaped. That is the registry's one-acceptance-proof-per-row.
//   this file           — the LAWS (sets): renderer purity + NON-MUTATION, composition NON-commutativity, and
//                         the assembler's "invents nothing". None re-runs the import-boundary structural test.
//   node overview/properties.test.mjs
import { composeDashboard } from './compose.mjs';
import { renderAnalyticsCard } from '../analytics/render.mjs';
import { renderDecisionCard } from '../decision/render.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d = '') => { (c ? pass++ : fail++); console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${c ? '' : '  <-- ' + d}`); };
const sections = page => (page.match(/<section class="card"/g) || []).length;   // how many cards the page claims

// Minimal synthetic DTOs — smallest shape each renderer tolerates; content is arbitrary, only shape matters.
const A = { overview: { reports: 7, reviews: 3 }, review: { override_rate: 0.5 }, rule: { would_block: 8, evaluated: 16 } };
const D = { recommendations: [{ id: 'p:hold', priority: 'HIGH', kind: 'HOLD' }] };
// Opaque card fragments — the shell must treat `html` as a black box; its internal structure is irrelevant.
const cardX = { id: 'x', title: 'X', html: '<p>BODY-X-42</p>' };
const cardY = { id: 'y', title: 'Y', html: '<ul><li>BODY-Y-99</li></ul>' };

try {
  console.log('PRESENTATION PROPERTIES — the laws of a renderer and a shell (Phase E.1)');

  // ALGEBRA — the RENDERER, one function in isolation. A card is a PURE PROJECTION of exactly one DTO:
  // deterministic, non-mutating, and it owns presentation only (a body fragment, never a page).
  {
    ok('renderer is deterministic: same DTO → same view (analytics)', renderAnalyticsCard(A) === renderAnalyticsCard(A));
    ok('renderer is deterministic: same DTO → same view (decision)', renderDecisionCard(D) === renderDecisionCard(D));
    // NON-MUTATION — the DTO is byte-identical after rendering. A renderer that read its input by mutating it
    // would make "same DTO → same view" a lie on the second call; this is the law that forbids it.
    ok('renderer does not mutate its DTO (analytics)', (() => { const s = JSON.stringify(A); renderAnalyticsCard(A); return JSON.stringify(A) === s; })());
    ok('renderer does not mutate its DTO (decision)', (() => { const s = JSON.stringify(D); renderDecisionCard(D); return JSON.stringify(D) === s; })());
    // Owns presentation only: a card is a BODY fragment; the page shell (<!doctype>, the <section> wrapper) is
    // the shell's, not the card's — so a renderer cannot smuggle page structure into its output.
    ok('a card is a fragment, not a page (owns no chrome)', !renderAnalyticsCard(A).includes('<!doctype') && !renderDecisionCard(D).includes('<section'));
  }

  // COMPOSITION — the SHELL, how cards combine. Composition is ORDERED: the shell lays cards out in the sequence
  // given, so it does NOT commute. This is the exact symmetry with Decision's policy composition.
  {
    const ab = composeDashboard({ generated_at: 't', cards: [cardX, cardY] });
    const ba = composeDashboard({ generated_at: 't', cards: [cardY, cardX] });
    ok('composition is NOT commutative: compose([X,Y]) ≠ compose([Y,X])', ab !== ba);
    // ...yet deterministic in the order given — same cards, same order → identical page.
    ok('composition is deterministic: same cards → identical page', ab === composeDashboard({ generated_at: 't', cards: [cardX, cardY] }));
    // The counter-example maps the edge: order is the ONLY difference, so the two pages hold the same MULTISET of
    // cards — non-commutativity is about arrangement, not about inventing or dropping content.
    ok('non-commutativity is arrangement only: both orders carry the same cards', sections(ab) === 2 && sections(ba) === 2 && ab.includes('BODY-X-42') && ba.includes('BODY-X-42'));
  }

  // SYSTEM — the ASSEMBLER end-to-end. The shell OWNS NO DATA, so the page INVENTS NOTHING: exactly one section
  // per input card (no phantom card), each opaque body verbatim (no re-rendering), and nothing when given nothing.
  {
    ok('invents no card: #sections = #cards', sections(composeDashboard({ cards: [cardX, cardY] })) === 2);
    ok('invents nothing from nothing: empty composition → zero cards, still a valid page', sections(composeDashboard({ cards: [] })) === 0 && composeDashboard({ cards: [] }).startsWith('<!doctype html>'));
    // Opacity — the body is placed verbatim regardless of its internal structure; the shell parses it into no
    // data. Two structurally-different fragments both survive byte-for-byte.
    const page = composeDashboard({ cards: [cardX, cardY] });
    ok('opaque bodies survive verbatim (shell reads no DTO)', page.includes('<p>BODY-X-42</p>') && page.includes('<ul><li>BODY-Y-99</li></ul>'));
    // End-to-end: renderers → shell. The page is a pure function of (A, D), and the rendered bodies appear in it
    // unchanged — the shell added only frame, exactly `page = layout(cards)`, inventing no data of its own.
    const pipe = a => composeDashboard({ generated_at: 't', cards: [{ id: 'a', title: 'A', html: renderAnalyticsCard(a) }, { id: 'd', title: 'D', html: renderDecisionCard(D) }] });
    ok('pipeline is deterministic: same (A,D) → same page', pipe(A) === pipe(A));
    ok('shell invents no data: each renderer\'s body appears verbatim in the page', pipe(A).includes(renderAnalyticsCard(A)) && pipe(A).includes(renderDecisionCard(D)));
  }
} finally { /* pure — nothing to clean up */ }

console.log(`\n${fail ? 'RED' : 'GREEN'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
