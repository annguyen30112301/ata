// Go-live extractor — YOU run this with a PAT.
//   - with a work-item type:  extracts that one type
//   - WITHOUT a type:         extracts EVERY work-item type in the project, one package each
// Each type becomes its own DRAFT Knowledge Package: knowledge/<org>-<type>/lifecycle.DRAFT.json
// (confirmed:false). The loader ignores non-lifecycle.json and refuses confirmed:false — so nothing
// uses a draft until a human reviews `allowed`, adds cases, sets confirmed:true, and renames it.
//
//   all types:   $env:AZDO_PAT="<pat>"; node connectors/azure-devops/process.run.mjs taggle "Taggle Health App - Research"
//   one type:    $env:AZDO_PAT="<pat>"; node connectors/azure-devops/process.run.mjs taggle "Taggle Health App - Research" Bug
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchStates, fetchAll, toLifecycleDraft, slug } from './process.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE = resolve(HERE, '../../knowledge');
const [org, project, type] = process.argv.slice(2);
if (!org || !project) {
  console.error('usage: AZDO_PAT=<pat> node connectors/azure-devops/process.run.mjs <org> <project> [workItemType]');
  process.exit(1);
}

async function writeDraft(draft) {
  const dir = resolve(KNOWLEDGE, draft.id);
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, 'lifecycle.DRAFT.json'), JSON.stringify(draft, null, 2));
  return `knowledge/${draft.id}/lifecycle.DRAFT.json`;
}

try {
  const drafts = type
    ? [toLifecycleDraft(await fetchStates({ org, project, type }), { id: `${slug(org)}-${slug(type)}`, type, org, project })]
    : await fetchAll({ org, project });

  if (!drafts.length) { console.error('no work-item types found'); process.exit(1); }
  console.log(`extracted ${drafts.length} work-item type(s):`);
  for (const d of drafts) {
    const path = await writeDraft(d);
    console.log(`  ${d.provenance.extracted_from.split('/')[1].padEnd(16)} states=${d.lifecycle.states.length}  -> ${path}`);
  }
  console.log('\nAll drafts are confirmed:false. For each you want to use: review `allowed`, add cases,');
  console.log('set confirmed:true, rename lifecycle.DRAFT.json -> lifecycle.json, then AVF_KNOWLEDGE=<id>.');
} catch (e) {
  console.error('EXTRACT FAILED:', e.message);
  process.exit(1);
}
