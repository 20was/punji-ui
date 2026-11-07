import sys,re,json
f=sys.argv[1]; s=open(f,encoding='utf8',errors='replace').read()
t=re.sub(r'<script[\s\S]*?</script>|<style[\s\S]*?</style>',' ',s); t=re.sub(r'<[^>]+>',' ',t); t=t.replace('&nbsp;',' '); t=re.sub(r'\s+',' ',t)
end=t.find('←'); 
if end<0: print(json.dumps({"err":"noarrow"})); sys.exit()
seg=t[:end]
start=seg.rfind('Saturday')  # grid header Sun..Sat
seg=seg[start:] if start>=0 else seg
pairs=[(int(a),int(b)) for a,b in re.findall(r'(?<![\d:])(\d{1,2}) (\d{2})(?![\d:])',seg)]
# keep monotonic BS sequence 1..N
seq=[];
for a,b in pairs:
    if a==len(seq)+1: seq.append(b)
mx=max([a for a,b in pairs if a<=32 and b<=31] or [0]); wrapped=[a for a,b in pairs[:pairs.index((1,seq[0]))]] if seq else []
print(json.dumps({"len":mx,"seqlen":len(seq),"ad1":seq[0] if seq else None,"wrapped":wrapped}))
