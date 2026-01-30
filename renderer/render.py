
import json
import os
import argparse
import sys
import traceback
from moviepy import *
from moviepy.video.VideoClip import ImageClip, ColorClip
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
from moviepy.video.fx import Resize

# ==========================================
# CONFIGURATION & DEFAULTS
# ==========================================

DEFAULT_JSON_FILE = "../storyboard_data.json"
DEFAULT_OUTPUT_FILE = "final_render.mp4"
ASSETS_DIR = "../assets"
TRANSITION_DURATION = 2.0
FPS = 30

# ==========================================
# ANIMATION LIBRARY
# ==========================================

def ease_out_cubic(t):
    """Math helper: Makes movement fast at start, slow at end."""
    return 1 - pow(1 - t, 3)

def get_obj_state(stage_data, obj_id):
    """Find object data by ID in a specific stage list."""
    assets_list = stage_data
    if isinstance(stage_data, dict):
        assets_list = stage_data.get('assets', [])
    for item in assets_list:
        if item["id"] == obj_id:
            return item
    return None

def main():
    # 1. Parse Arguments
    parser = argparse.ArgumentParser(description='Render storyboard video.')
    parser.add_argument('--input', type=str, default=DEFAULT_JSON_FILE, help='Path to input JSON file')
    parser.add_argument('--output', type=str, default=DEFAULT_OUTPUT_FILE, help='Path to output MP4 file')
    args = parser.parse_args()

    JSON_FILE = args.input
    OUTPUT_FILE = args.output

    if not os.path.exists(JSON_FILE):
        print(f"Error: {JSON_FILE} not found.")
        return

    # 2. Load Data
    try:
        with open(JSON_FILE, 'r') as f:
            data = json.load(f)
        
        stages = data['stages']
        if not stages:
            print("No stages found.")
            return
            
        res = data.get('artboard', {'width': 360, 'height': 640})
        
        # Scale logic
        SCALE = 1
        if res['width'] < 500: SCALE = 3
        VIDEO_SIZE = (res['width'] * SCALE, res['height'] * SCALE)
        print(f"Rendering at {VIDEO_SIZE}")
        
        # Collect IDs
        all_obj_ids = set()
        for stage in stages:
            assets = stage.get('assets', []) if isinstance(stage, dict) else stage
            for obj in assets:
                all_obj_ids.add(obj['id'])
        
        print(f"DEBUG: Found {len(all_obj_ids)} unique objects.")
        
        clips = []

        # Background
        total_duration = (len(stages) - 1) * TRANSITION_DURATION
        if total_duration == 0: total_duration = 2.0
        
        print(f"DEBUG: Creating background for {total_duration}s...")
        bg = ColorClip(size=VIDEO_SIZE, color=(255, 255, 255)).with_duration(total_duration)
        clips.append(bg)

        # 3. Process Objects
        print(f"DEBUG: Processing objects...")
        
        for obj_id in all_obj_ids:
            # Find first occurrence to get filename/style
            first_state = None
            for s in stages:
                state = get_obj_state(s, obj_id)
                if state:
                    first_state = state
                    break
            
            if not first_state: continue

            filename = first_state.get('filename')
            if not filename:
                 print(f"Warning: Object {obj_id} has no filename.")
                 continue
                
            path = os.path.join(ASSETS_DIR, filename)
            if not os.path.exists(path):
                print(f"Warning: Asset {filename} not found at {path}")
                continue

            # Load image
            img_clip = ImageClip(path)

            def get_pos(state):
                if 'position' in state:
                    return state['position']['x'] * SCALE, state['position']['y'] * SCALE
                return state['x'] * SCALE, state['y'] * SCALE

            def get_size(state):
                if 'size' in state:
                    return state['size']['width'] * SCALE, state['size']['height'] * SCALE
                return state['width'] * SCALE, state['height'] * SCALE

            base_w, base_h = get_size(first_state)
            
            # Initial Resize
            img_clip = img_clip.with_effects([Resize(new_size=(base_w, base_h))])
            
            anim_style = first_state.get('animationStyle', 'fade_in')

            # --- DYNAMIC POSITION LOGIC ---
            def make_pos_func(oid, stages_list, dur_per_stage, style):
                def pos(t):
                    # A. Base Keyframe Interpolation
                    segment_idx = int(t // dur_per_stage)
                    
                    if segment_idx >= len(stages_list) - 1:
                        last_state = get_obj_state(stages_list[-1], oid)
                        base_x, base_y = get_pos(last_state) if last_state else (-1000, -1000)
                    else:
                        segment_t = t % dur_per_stage
                        progress = segment_t / dur_per_stage
                        
                        start_state = get_obj_state(stages_list[segment_idx], oid)
                        end_state = get_obj_state(stages_list[segment_idx+1], oid)
                        
                        if start_state and end_state:
                             sx, sy = get_pos(start_state)
                             ex, ey = get_pos(end_state)
                             base_x = sx + (ex - sx) * progress
                             base_y = sy + (ey - sy) * progress
                        elif start_state:
                             base_x, base_y = get_pos(start_state)
                        elif end_state:
                             base_x, base_y = get_pos(end_state)
                        else:
                             base_x, base_y = (-1000, -1000)

                    # B. Apply Entrance Animation (Offset)
                    if t < dur_per_stage: # During first stage
                        prog = t / dur_per_stage
                        eased_prog = ease_out_cubic(prog)
                        
                        if style == "slide_from_bottom":
                             # Slide from bottom OF SCREEN
                             # start_y should be just offscreen
                             start_y_off = VIDEO_SIZE[1] + 100
                             
                             # We interpolate from 'start_y_off' to 'base_y'
                             # Note: base_y is already moving if there is stage0->stage1 movement!
                             # But here we assume Entrance dominates.
                             # Actually, let's just add an offset that decays?
                             # Offset = (Start - Target) * (1-eased)
                             # No, that's complex. Let's stick to interpolation.
                             
                             s0 = get_obj_state(stages_list[0], oid)
                             target_x, target_y = get_pos(s0) if s0 else (base_x, base_y)
                             
                             # Interpolate Y
                             current_y = start_y_off + (target_y - start_y_off) * eased_prog
                             return (base_x, int(current_y)) 
                             
                        elif style == "slide_from_side":
                            s0 = get_obj_state(stages_list[0], oid)
                            target_x, target_y = get_pos(s0) if s0 else (base_x, base_y)
                            
                            if target_x > VIDEO_SIZE[0] / 2:
                                start_x = VIDEO_SIZE[0] + 100
                            else:
                                start_x = -base_w - 100
                            
                            current_x = start_x + (target_x - start_x) * eased_prog
                            return (int(current_x), base_y)

                    return (base_x, base_y)
                return pos

            # Apply Position
            img_clip = img_clip.with_position(make_pos_func(obj_id, stages, TRANSITION_DURATION, anim_style))
            
            # Apply Opacity/Scale Effects
            if anim_style == "fade_in":
                img_clip = img_clip.with_effects([vfx.CrossFadeIn(TRANSITION_DURATION)])
            elif anim_style == "wipe_reveal":
                img_clip = img_clip.with_effects([vfx.CrossFadeIn(TRANSITION_DURATION)])

            img_clip = img_clip.with_duration(total_duration)
            img_clip = img_clip.with_start(0)

            clips.append(img_clip)

        # 4. Render
        print("Compositing...")
        final = CompositeVideoClip(clips, size=VIDEO_SIZE)
        
        print(f"Rendering to {OUTPUT_FILE} ({total_duration}s)...")
        final.write_videofile(OUTPUT_FILE, fps=FPS)
        print("Done!")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    main()
