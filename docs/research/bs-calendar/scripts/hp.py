import sys,re,json,collections
recs={}
for f in sys.argv[1:]:
    s=open(f,encoding='utf8',errors='replace').read()
    for m in re.finditer(r'"year_ad":(\d+),"month_ad":(\d+),"day_ad":(\d+),"year_bs":(\d+),"month_bs":(\d+),"day_bs":(\d+)',s):
        ya,ma,da,yb,mb,db=map(int,m.groups()); recs[(yb,mb,db)]=(ya,ma,da)
by=collections.defaultdict(dict)
for (yb,mb,db),ad in recs.items(): by[(yb,mb)][db]=ad
out={}
for k in sorted(by):
    d=by[k]; days=sorted(d); complete = days==list(range(1,max(days)+1))
    out[f"{k[0]}-{k[1]}"]={"max":max(days),"complete":complete,"first":d.get(1),"last":d[max(days)]}
print(json.dumps(out))
