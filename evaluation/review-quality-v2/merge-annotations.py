"""Merge two independently blinded judgments without consulting predictions."""
from pathlib import Path
import collections
import hashlib
import json

base = Path(__file__).resolve().parent
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
dataset = read(base / 'cases.json')
ids = {case['id'] for case in dataset['cases']}
rounds, sources = [], []
for round_no in [1, 2]:
    labels = {}
    for packet_no in [1, 2, 3]:
        path = base / f'annotations-r{round_no}-p{packet_no}.json'
        packet = read(base / 'annotation-packets' / f'r{round_no}-p{packet_no}.json')
        data = read(path)
        assert data['schemaVersion'] == 2 and data['datasetId'] == dataset['datasetId']
        expected = {case['id'] for case in packet['cases']}
        actual = [row['caseId'] for row in data['annotations']]
        assert len(actual) == 80 and len(set(actual)) == 80 and set(actual) == expected
        for row in data['annotations']:
            assert row['caseId'] not in labels
            assert row['decision'] in ['duplicate', 'distinct', 'ambiguous']
            assert row['evidenceTier'] in ['none', 'potentially-related', 'needs-verification', 'strong-duplicate-evidence', 'ambiguous']
            assert row['rationale'].strip() and row['tierRationale'].strip()
            labels[row['caseId']] = row
        sources.append({'file':path.name, 'sha256':sha(path), 'count':len(actual)})
    assert set(labels) == ids
    repair_path = base / f'annotations-schema-repair-r{round_no}.json'
    repair = read(repair_path)
    assert repair['schemaVersion'] == 2 and repair['datasetId'] == dataset['datasetId']
    repaired_ids = {case['id'] for case in read(base / 'annotation-packets' / 'schema-repair.json')['cases']}
    assert len(repair['annotations']) == len(repaired_ids) == 1
    assert {row['caseId'] for row in repair['annotations']} == repaired_ids
    for row in repair['annotations']:
        labels[row['caseId']] = row
    sources.append({'file':repair_path.name, 'sha256':sha(repair_path), 'count':1, 'purpose':'Replaces original judgment only for schema-corrected pair, before any inference'})
    rounds.append(labels)
merged, disagreements = [], []
for case_id in sorted(ids):
    first, second = (labels[case_id] for labels in rounds)
    identity_agrees = first['decision'] == second['decision']
    tier_agrees = first['evidenceTier'] == second['evidenceTier']
    merged.append({'caseId':case_id,
                   'decision':first['decision'] if identity_agrees else 'ambiguous',
                   'evidenceTier':first['evidenceTier'] if tier_agrees else 'ambiguous',
                   'rationale':'Reviewer 1: ' + first['rationale'] + '\nReviewer 2: ' + second['rationale'],
                   'tierRationale':'Reviewer 1: ' + first['tierRationale'] + '\nReviewer 2: ' + second['tierRationale'],
                   'confidence':f"Subjective r1={first['confidence']}; r2={second['confidence']}; no expert adjudication"})
    if not identity_agrees or not tier_agrees:
        disagreements.append({'caseId':case_id,'identityAgrees':identity_agrees,'tierAgrees':tier_agrees,
                              'identityJudgments':[first['decision'],second['decision']],
                              'tierJudgments':[first['evidenceTier'],second['evidenceTier']]})
method = read(base / 'annotation-method.json')
repair = read(base / 'authoring-schema-repair.json')
assert method['datasetSha256'] == repair['beforeDatasetSha256']
assert sha(base / 'cases.json') == repair['afterDatasetSha256']
method['initialAuthorDatasetSha256'] = method['datasetSha256']
method['datasetSha256'] = repair['afterDatasetSha256']
method['schemaRepair'] = {'file':'authoring-schema-repair.json','sha256':sha(base / 'authoring-schema-repair.json'),'beforePredictions':True,'freshBlindJudgments':2}
method['rawJudgments'] = sources
method['mergeRule'] = 'Two independent judgments; identity disagreement => ambiguous; tier disagreement => ambiguous; no prediction-based adjudication.'
output = {'schemaVersion':2,'datasetId':dataset['datasetId'],'method':method,'annotations':merged}
# Exclusive writes protect the completed annotation work from accidental replacement.
with (base / 'annotations.json').open('x') as target:
    target.write(json.dumps(output,indent=2) + '\n')
agreement = {'cases':len(merged),'judgments':480,'preservedRawJudgmentsIncludingSuperseded':sum(x['count'] for x in sources),
             'identityDisagreements':sum(not x['identityAgrees'] for x in disagreements),
             'tierDisagreements':sum(not x['tierAgrees'] for x in disagreements),
             'decisions':dict(collections.Counter(x['decision'] for x in merged)),
             'tiers':dict(collections.Counter(x['evidenceTier'] for x in merged)),
             'disagreements':disagreements,'rawSources':sources,
             'annotationsSha256':sha(base / 'annotations.json')}
with (base / 'annotation-agreement.json').open('x') as target:
    target.write(json.dumps(agreement,indent=2) + '\n')
print(json.dumps({k:v for k,v in agreement.items() if k not in ['disagreements','rawSources']}))
