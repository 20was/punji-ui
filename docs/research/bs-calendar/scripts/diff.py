import json,re,sys,csv,collections
base=sys.argv[1]
A=json.load(open(base+'/data/all.json'))
A={k:{int(y):v for y,v in t.items()} for k,t in A.items()}
t={}
for r in list(csv.reader(open(base+'/py/nepali_datetime/nepali_datetime/data/calendar_bs.csv')))[1:]:
    t[int(r[0])]=list(map(int,r[1:13]))
A['nepali-datetime@1.0.8.5 (PyPI, amitgaru)']=t
s=open(base+'/py/nepali/nepali/date_converter.py').read()
blk=s[s.index('NP_MONTHS_DATA'):]
rows=re.findall(r'\(\s*\(([\d,\s]+)\)\s*,\s*\d+\s*,?\s*\)',blk)
A['nepali@1.2.0 (PyPI, opensource-nepal)']={2000+i:list(map(int,r.split(',')[:12])) for i,r in enumerate(rows)}
json.dump({k:{str(y):v for y,v in t.items()} for k,t in A.items()},open(base+'/data/all.json','w'))
names=list(A)
for k in names: print(f"{k}: {min(A[k])}-{max(A[k])} ({len(A[k])} yrs)")
# per-year consensus
allyears=sorted(set().union(*[set(A[k]) for k in names]))
report=[]
disagree_years=[]
for y in allyears:
    vals={k:tuple(A[k][y]) for k in names if y in A[k]}
    c=collections.Counter(vals.values())
    if len(c)>1:
        disagree_years.append(y)
        maj,n=c.most_common(1)[0]
        report.append((y,len(vals),maj,n,{k:v for k,v in vals.items() if v!=maj}))
print('\nyears with any disagreement:',len(disagree_years))
for y,tot,maj,n,odd in report:
    print(f"\n{y}: majority {n}/{tot} {list(maj)} sum={sum(maj)}")
    for k,v in odd.items():
        diffs=[f"m{i+1}:{maj[i]}->{v[i]}" for i in range(12) if v[i]!=maj[i]]
        print(f"   {k}: {' '.join(diffs)} sum={sum(v)}")
