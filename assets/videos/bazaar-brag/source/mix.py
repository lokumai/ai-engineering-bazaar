"""Mix the soundtrack: ende.app "Happy Beats / Business Moves" vol. 9 (CC BY 4.0) from 18.44 s,
plus Kenney SFX (CC0) from the brag skill's library, sitting under the music. Two-pass loudnorm.
Usage: python3 mix.py <workDir> <bragSkillAssetsDir>"""
import json, subprocess, sys, os

work, assets = sys.argv[1], sys.argv[2]
music = os.path.join(assets, 'music/happy-beats-business-moves-vol-9-by-ende-dot-app.mp3')
OFF, DUR = 18.44, 30.0

# (time s, file under sfx/, gain): every hit lands on a visual event in timeline.js
SFX = [
    (0.03, 'impact/impactSoft_medium_001.ogg', 0.55),            # POV block
    *[(t, f'keyboard/keypress-00{i + 1}.wav', 0.28) for i, t in enumerate([0.3, 0.44, 0.58, 0.76, 0.9, 1.041])],
    (3.155, 'interface/glitch_004.ogg', 0.5),                    # the feed crashes
    (3.677, 'interface/error_005.ogg', 0.4),                     # brain.exe dialog
    (5.72, 'interface/click_003.ogg', 0.9),                      # cursor click
    (6.30, 'casino/card-slide-1.ogg', 0.35),                     # button floods the screen
    (6.835, 'impact/impactSoft_heavy_001.ogg', 0.6),             # the bar
    *[(t, f'impact/impactWood_light_00{i}.ogg', 0.22) for i, t in enumerate([7.6, 7.8, 8.0, 8.2])],
    (8.41, 'impact/impactSoft_medium_003.ogg', 0.45),            # last lokum cube
    (9.62, 'casino/card-slide-3.ogg', 0.3),                      # into the gate
    (10.05, 'casino/card-place-1.ogg', 0.3),                     # sign 1
    (11.572, 'impact/impactPunch_medium_000.ogg', 0.4),          # no cap
    (13.0, 'casino/card-slide-2.ogg', 0.28),                     # pan
    (13.17, 'casino/card-place-2.ogg', 0.28),                    # sign 2
    (16.68, 'casino/card-slide-4.ogg', 0.28),                    # pan
    (16.85, 'casino/card-place-3.ogg', 0.28),                    # sign 3
    (17.25, 'casino/card-place-4.ogg', 0.3),                     # polaroid 1
    (17.62, 'casino/card-shove-1.ogg', 0.3),                     # polaroid 2
    (18.42, 'impact/impactPunch_medium_002.ogg', 0.4),           # memes included
    (19.467, 'impact/impactSoft_medium_002.ogg', 0.5),           # receipt drops
    *[(t, f'keyboard/keypress-0{10 + i}.wav', 0.3) for i, t in enumerate([19.989, 20.523, 21.046, 21.568, 22.09, 22.625])],
    (23.681, 'impact/impactBell_heavy_000.ogg', 0.3),            # TOTAL
    (24.738, 'impact/impactPunch_heavy_000.ogg', 0.5),           # FREE stamp
    (25.98, 'casino/card-slide-5.ogg', 0.3),                     # receipt flies off
    (26.305, 'impact/impactSoft_heavy_004.ogg', 0.55),           # outro lands
    (26.45, 'interface/bong_001.ogg', 0.35),                     # logo
    (27.361, 'impact/impactPunch_medium_003.ogg', 0.38),         # (ok, a little)
]

inputs = ['-ss', str(OFF), '-t', str(DUR), '-i', music]
for _, f, _ in SFX:
    inputs += ['-i', os.path.join(assets, 'sfx', f)]
chains = [f'[0:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=in:st=0:d=0.12,afade=t=out:st=27.8:d=2.2,volume=0.92[m]']
labels = ['[m]']
for i, (t, _, g) in enumerate(SFX, start=1):
    ms = int(round(t * 1000))
    # a gentle low-pass and a short room keep the clicks in the music's space instead of on top of it
    chains.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,lowpass=f=7000,aecho=0.8:0.5:28:0.18,volume={g},adelay={ms}|{ms}[s{i}]')
    labels.append(f'[s{i}]')
mix = ';'.join(chains) + ';' + ''.join(labels) + f'amix=inputs={len(labels)}:normalize=0:duration=first,atrim=0:{DUR}'

def run(extra, out):
    return subprocess.run(['ffmpeg', '-y', '-hide_banner', *inputs, '-filter_complex', mix + extra, *out], capture_output=True, text=True)

# pass 1: measure
r = run(',loudnorm=I=-14.5:TP=-1.5:LRA=11:print_format=json[o]', ['-map', '[o]', '-f', 'null', '-'])
js = r.stderr[r.stderr.rindex('{'):r.stderr.rindex('}') + 1]
m = json.loads(js)
ln = (f",loudnorm=I=-14.5:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true[o]")
r = run(ln, ['-map', '[o]', '-ar', '48000', '-c:a', 'pcm_s16le', os.path.join(work, 'mix.wav')])
if r.returncode: print(r.stderr[-2000:]); sys.exit(1)
print('mixed', os.path.join(work, 'mix.wav'), 'pass-1 input', m['input_i'], 'LUFS')
