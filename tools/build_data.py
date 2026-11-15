"""Builds site/data/site.json and web-sized media from the Supabase export.
Later the same shape will be produced from the Google Sheet CMS."""
import json, os, re, shutil, subprocess
from PIL import Image, ImageOps
E='content'; S='site'  # run from repo root; original images go in tools/raw/ (not committed)
L=lambda n: json.load(open(f'{E}/{n}.json'))
os.makedirs(f'{S}/media/img',exist_ok=True); os.makedirs(f'{S}/media/audio',exist_ok=True)
def slug(s): return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
def img(url, name, big=2000, small=800):
    if not url: return None
    src='tools/raw/'+url.split('/')[-1]
    if not os.path.exists(src): print('missing',url); return None
    im=ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    out={'w':im.width,'h':im.height}
    for tag,size in (('',big),('-s',small)):
        c=im.copy(); c.thumbnail((size,size),Image.LANCZOS)
        p=f'media/img/{name}{tag}.jpg'; c.save(f'{S}/{p}','JPEG',quality=82 if tag=='' else 78,optimize=True,progressive=True)
        out['src' if tag=='' else 'thumb']='/'+p
    out['ratio']=round(im.width/im.height,4)
    return out
tags={t['id']:t['name'] for t in L('tags')}
truthy=lambda v: v is True or v=='True' or v=='true'

cats=[c for c in L('photo_categories') if truthy(c['publish'])]
catname={c['id']:c['name'].replace('Sanpshots','Snapshots') for c in cats}
order=['street-scenes','nyc','scenic-okinawa','documentary-and-street','portraits','just-snapshots']
cats.sort(key=lambda c: order.index(c['slug']) if c['slug'] in order else 99)
photos=[]
for i,p in enumerate(sorted(L('photos'),key=lambda p:(p['order_index'] or 0,p['created_at']))):
    pid=p['image_url'].split('/')[-1].split('.')[0]
    photos.append({'id':pid,'title':p['title'],'caption':p['caption'] or '','alt':p['alt_text'] or p['title'],
      'camera':(p['camera'] or '').strip(),'location':p['location'] or '','category':catname.get(p['category_id'],''),
      'featured':truthy(p['featured']) or truthy(p['featured_on_homepage']),'image':img(p['image_url'],'p-'+pid)})
categories=[{'name':catname[c['id']],'slug':c['slug'],'description':c['description'],'cover':img(c['cover_image_url'],'c-'+c['slug'],1600,800)} for c in cats]

cams=[]
for c in L('cameras'):
    name=c['name']; shots=[p['id'] for p in photos if p['camera']==name]
    cams.append({'name':name,'slug':slug(name),'body':re.split(r'\s*[,\-–]\s+',name)[0],'lens':(re.split(r'\s*[,\-–]\s+',name,1)+[''])[1],
                 'photos':shots,'amazon':''})
gear_imgs=json.load(open(E+'/gear_images.json')) if os.path.exists(E+'/gear_images.json') else {}
PRETTY={'Sony RX1rIII':'Sony RX1R III','Canon 1Ds MarkIII':'Canon EOS-1Ds Mark III'}
for c in cams: c['body']=PRETTY.get(c['body'],c['body'])
for c in cams: c['gear_image']=gear_imgs.get(c['body'])  # product photos (Wikimedia Commons, credited); media/gear/
cams.sort(key=lambda c:-len(c['photos']))

audio={f.split('-')[0]:f for f in os.listdir(f'{E}/audio')}
mtools={}
for t in L('music_tools'): mtools.setdefault(t['music_id'],[]).append(t['name'])
music=[]
for m in sorted(L('music'),key=lambda m:m['created_at']):
    if not truthy(m['publish']): continue
    key=m['audio_url'].split('/')[-1].split('-')[0]; f=audio.get(key)
    if f: shutil.copy(f'{E}/audio/{f}',f'{S}/media/audio/{m["slug"]}.mp3')
    title=m['title']
    music.append({'title':title,'slug':m['slug'],'genre':m['genre'],'year':m['year'],'description':m['description'] or '',
      'inspiration':m['inspiration'] or '','lyrics':m['lyrics'] or '','spotify':m['spotify_url'] or '','apple':m['apple_music_url'] or '',
      'tools':mtools.get(m['id'],[]),'audio':f'/media/audio/{m["slug"]}.mp3' if f else '','cover':img(m['album_art_url'],'m-'+m['slug'],1200,500),
      'featured':truthy(m['featured'])})
    if f: music[-1]['duration']=round(float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'{S}/media/audio/{m["slug"]}.mp3']).strip()))
music.reverse()  # newest first

atools={};atags={}
for t in L('generative_art_tools'): atools.setdefault(t['generative_art_id'],[]).append(t['name'])
for t in L('generative_art_tags'): atags.setdefault(t['generative_art_id'],[]).append(tags.get(t['tag_id']))
art=[{'title':a['title'],'slug':a['slug'],'description':a['description'],'year':a['year'],'prompt':a.get('prompt') or '',
      'tools':atools.get(a['id'],[]),'tags':[t for t in atags.get(a['id'],[]) if t],'image':img(a['image_url'],'a-'+a['slug'])}
     for a in L('generative_art') if truthy(a['publish'])]

ptags={}
for t in L('project_tags'): ptags.setdefault(t['project_id'],[]).append(tags.get(t['tag_id']))
built={'parametra-music':['Suno','Lovable','Web Audio'],'the-poetic-ai':['Replit','Vibe-coding'],'photo-bookshelf':['Lovable','Supabase']}
projects=[]
for p in sorted(L('projects'),key=lambda p:p['year'],reverse=True):
    if not truthy(p['publish']): continue
    projects.append({'title':p['title'],'slug':p['slug'],'summary':p['short_summary'],'description':p['description'],'category':p['category'],
      'type':p['type'],'year':p['year'],'url':p['project_url'],'tags':[t for t in ptags.get(p['id'],[]) if t],
      'image':img(p['image_url'],'pr-'+p['slug'])})
ab=L('about_page')[0]
about={'name':'Thomas Alan Smilie','subtitle':ab['subtitle'],'content':ab['content'],'portrait':img(ab['image_url'],'about',1400,700),
  'linkedin':'https://www.linkedin.com/in/tasmilie','writing':'https://onetobetter.com'}
site={'title':'Thomas Alan','tagline':'Photographs, songs, and things I build, from Okinawa.','photos':photos,'categories':categories,
  'cameras':cams,'music':music,'art':art,'projects':projects,'about':about,'amazon_tag':'',
  'spotlight':json.load(open('content/spotlight.json'))}  # home Featured: newest 4 by date
os.makedirs(f'{S}/data',exist_ok=True)
json.dump(site,open(f'{S}/data/site.json','w'),ensure_ascii=False,indent=1)
print(len(photos),len(categories),len(cams),len(music),len(art),len(projects))
print([ (c['name'],len(c['photos'])) for c in cams])
print(about['portrait'], [p['image'] and p['image']['src'] for p in projects])
