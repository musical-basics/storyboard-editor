
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
ASSETS_DIR = "local_assets"
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
        # Each stage gets TRANSITION_DURATION seconds
        total_duration = len(stages) * TRANSITION_DURATION
        if total_duration == 0: total_duration = 2.0
        
        print(f"DEBUG: Creating background for {total_duration}s...")
        bg = ColorClip(size=VIDEO_SIZE, color=(255, 255, 255)).with_duration(total_duration)
        clips.append(bg)

        # 3. Process Objects
        print(f"DEBUG: Processing objects...")
        
        for obj_id in all_obj_ids:
            # --- STAGE VISIBILITY: Find which stages this object appears in ---
            stage_indices = [i for i, s in enumerate(stages) if get_obj_state(s, obj_id)]
            
            if not stage_indices:
                continue
            
            first_stage_idx = min(stage_indices)
            last_stage_idx = max(stage_indices)
            
            # Calculate timing
            start_time = first_stage_idx * TRANSITION_DURATION
            end_time = (last_stage_idx + 1) * TRANSITION_DURATION
            if end_time > total_duration:
                end_time = total_duration
            obj_duration = end_time - start_time
            
            if obj_duration <= 0:
                continue

            # Find first occurrence to get filename/style
            first_state = get_obj_state(stages[first_stage_idx], obj_id)
            if not first_state: continue

            filename = first_state.get('filename')
            if not filename:
                 print(f"Warning: Object {obj_id} has no filename.")
                 continue
            
            # Handle API URLs (e.g. /api/images/foo.png -> foo.png)
            filename = os.path.basename(filename)
                
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
            
            # --- RESIZE LOGIC (CONTAIN) ---
            img_w, img_h = img_clip.size
            scale_factor = min(base_w / img_w, base_h / img_h)
            new_w = int(img_w * scale_factor)
            new_h = int(img_h * scale_factor)
            
            img_content = img_clip.with_effects([Resize(new_size=(new_w, new_h))])
            img_content = img_content.with_duration(obj_duration)
            
            img_clip = CompositeVideoClip([img_content.with_position("center")], size=(base_w, base_h))
            img_clip = img_clip.with_duration(obj_duration)
            
            anim_style = first_state.get('animationStyle', 'fade_in')

            # --- DYNAMIC POSITION LOGIC (adjusted for object's start_time) ---
            def make_pos_func(oid, stages_list, dur_per_stage, style, obj_start_time, first_idx):
                def pos(t):
                    # Adjust t to be relative to the full video timeline
                    global_t = t + obj_start_time
                    
                    # A. Base Keyframe Interpolation
                    segment_idx = int(global_t // dur_per_stage)
                    
                    if segment_idx >= len(stages_list) - 1:
                        last_state = get_obj_state(stages_list[-1], oid)
                        base_x, base_y = get_pos(last_state) if last_state else (-1000, -1000)
                    else:
                        segment_t = global_t % dur_per_stage
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

                    # B. Apply Entrance Animation (only during first stage of this object)
                    time_in_first_stage = global_t - (first_idx * dur_per_stage)
                    if time_in_first_stage >= 0 and time_in_first_stage < dur_per_stage:
                        prog = time_in_first_stage / dur_per_stage
                        eased_prog = ease_out_cubic(prog)
                        
                        if style == "slide_from_bottom":
                             start_y_off = VIDEO_SIZE[1] + 100
                             s0 = get_obj_state(stages_list[first_idx], oid)
                             target_x, target_y = get_pos(s0) if s0 else (base_x, base_y)
                             current_y = start_y_off + (target_y - start_y_off) * eased_prog
                             return (base_x, int(current_y)) 
                             
                        elif style == "slide_from_side":
                            s0 = get_obj_state(stages_list[first_idx], oid)
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
            img_clip = img_clip.with_position(make_pos_func(obj_id, stages, TRANSITION_DURATION, anim_style, start_time, first_stage_idx))
            
            # Apply Fade Effects
            fade_duration = min(0.5, obj_duration / 2)
            if anim_style == "fade_in" or anim_style == "wipe_reveal":
                img_clip = img_clip.with_effects([vfx.CrossFadeIn(fade_duration)])
            
            # Apply fade out if object disappears before video ends
            if last_stage_idx < len(stages) - 1:
                img_clip = img_clip.with_effects([vfx.CrossFadeOut(fade_duration)])

            img_clip = img_clip.with_start(start_time)

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
