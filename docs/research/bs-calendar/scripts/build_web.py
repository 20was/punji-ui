import json,glob,datetime,re,os,sys
D='data'; all_=json.load(open(f'{D}/all.json'))
# Hamro Patro
first={}
for f in glob.glob('web/hp/*.json'):
    try: d=json.load(open(f))
    except Exception: continue
    for k,v in d.items():
        if v.get('first'):
            y,m=map(int,k.split('-')); first[(y,m)]=tuple(v['first'])
hp={}
for (y,m),ad in first.items():
    ny,nm=(y,m+1) if m<12 else (y+1,1)
    if (ny,nm) in first:
        L=(datetime.date(*first[(ny,nm)])-datetime.date(*ad)).days
        hp.setdefault(str(y),[None]*12)[m-1]=L
hp={y:r for y,r in hp.items() if None not in r}
all_['hamropatro.com (web, scraped)']=hp
# rat32
r32={}
for f in glob.glob('web/r32/*.json'):
    y,m=map(int,re.findall(r'(\d+)-(\d+)\.json',f)[0]); d=json.load(open(f))
    r32.setdefault(str(y),[None]*12)[m-1]=d.get('len') or None
r32={y:r for y,r in r32.items() if None not in r}
all_['nepalicalendar.rat32.com (web, scraped)']=r32
json.dump(all_,open(f'{D}/all.json','w'))
print('hp years',min(hp),max(hp),len(hp),' r32',min(r32),max(r32),len(r32))
# sanity sums
for n in ['hamropatro.com (web, scraped)','nepalicalendar.rat32.com (web, scraped)']:
    for y,r in sorted(all_[n].items()):
        s=sum(r)
        if s<364 or s>367: print('BADSUM',n,y,r,s)
