"""Adds waveform peaks to site.json music entries and writes /media/audio/<slug>.viz.txt
(beat envelope: 4 bands x 20 fps, base36 chars) used by the visualizer. Run from repo root."""
import json, subprocess, numpy as np
S='site'; SR=22050; FPS=20; HOP=SR//FPS; N=1024; B36='0123456789abcdefghijklmnopqrstuvwxyz'
d=json.load(open(f'{S}/data/site.json'))
f=np.fft.rfftfreq(N,1/SR); bands=[(40,150),(150,600),(600,2500),(2500,9000)]
masks=[(f>=a)&(f<b) for a,b in bands]; win=np.hanning(N)
for m in d['music']:
    if not m.get('audio'): continue
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',S+m['audio'],'-ac','1','-ar',str(SR),'-f','s16le','-'])
    x=np.frombuffer(raw,dtype=np.int16).astype(np.float32)/32768
    chunks=np.array_split(np.abs(x),72); p=np.array([np.sqrt((c**2).mean()) for c in chunks]); p=p/max(p.max(),1e-9)
    m['peaks']=[int(round(v*99)) for v in p]
    nf=max(1,(len(x)-N)//HOP); out=np.zeros((nf,4),np.float32)
    for i in range(nf):
        s=np.abs(np.fft.rfft(x[i*HOP:i*HOP+N]*win))
        out[i]=[s[k].mean() for k in masks]
    out=20*np.log10(out+1e-6)
    lo=np.percentile(out,5,axis=0); hi=np.percentile(out,98,axis=0)
    q=np.clip((out-lo)/(hi-lo),0,1); q=(q**1.4*35).round().astype(int)
    open(f"{S}/media/audio/{m['slug']}.viz.txt",'w').write(''.join(B36[v] for v in q.flatten()))
    print(m['slug'],nf)
json.dump(d,open(f'{S}/data/site.json','w'),ensure_ascii=False,separators=(',',':'))
