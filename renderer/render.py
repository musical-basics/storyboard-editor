import json
import os
from moviepy import *
from moviepy.video.VideoClip import ImageClip, ColorClip
from moviepy.video.compositing.CompositeVideoClip import CompositeVideoClip
from moviepy.video.fx import Resize

# ==========================================
# CONFIGURATION
# ==========================================

import argparse
import sys

# Define defaults
DEFAULT_JSON_FILE = "../storyboard_data.json"
DEFAULT_OUTPUT_FILE = "final_render.mp4"
ASSETS_DIR = "../assets"

# Parse arguments
parser = argparse.ArgumentParser(description='Render storyboard video.')
parser.add_argument('--input', type=str, default=DEFAULT_JSON_FILE, help='Path to input JSON file')
parser.add_argument('--output', type=str, default=DEFAULT_OUTPUT_FILE, help='Path to output MP4 file')
args = parser.parse_args()

JSON_FILE = args.input
OUTPUT_FILE = args.output

TRANSITION_DURATION = 2.0 # Seconds between keys
FPS = 30


def get_obj_state(stage_data, obj_id):
    """Find object data by ID in a specific stage list."""
    # Handle both list (old style) and dict (new style) for resilience
    assets_list = stage_data
    if isinstance(stage_data, dict):
        assets_list = stage_data.get('assets', [])
        
    for item in assets_list:
        if item["id"] == obj_id:
            return item
    return None

def main():
    if not os.path.exists(JSON_FILE):
        print(f"Error: {JSON_FILE} not found. Export it from editor.html first.")
        return

    with open(JSON_FILE, 'r') as f:
        data = json.load(f)

    stages = data['stages']
    if not stages:
        print("No stages found in JSON.")
        return

    # Video Resolution from JSON or default
    res = data.get('artboard', {'width': 360, 'height': 640}) # Updated default key
    
    # Scale resolution up for video? The artboard is 360x640 (9:16 mobile)
    # Let's verify if we want native or scaled. 
    # If artboard is 360 wide, we probably want to render at that or scaled up.
    # Let's default to HD vertical if small? Or just respect artboard.
    # Let's respect artboard for now but maybe scale x2 for quality?
    SCALE = 1
    if res['width'] < 500: SCALE = 3 # 360 -> 1080p width roughly
    
    VIDEO_SIZE = (res['width'] * SCALE, res['height'] * SCALE)
    print(f"Rendering at {VIDEO_SIZE}")
    
    # Collect all unique objects across all stages
    all_obj_ids = set()
    for stage in stages:
        assets = stage.get('assets', []) if isinstance(stage, dict) else stage
        for obj in assets:
            all_obj_ids.add(obj['id'])

    clips = []
    

# ==========================================
# ANIMATION LIBRARY
# ==========================================

def ease_out_cubic(t):
    """
    Math helper: Makes movement fast at start, slow at end.
    t: current progress (0.0 to 1.0)
    """
    return 1 - pow(1 - t, 3)

def animate_clip(clip, style, final_pos, duration=1.0, start_time=0, screen_size=(1080, 1920)):
    """
    Factory function to apply the correct style.
    """
    final_x, final_y = final_pos
    w, h = clip.size
    screen_w, screen_h = screen_size

    # 1. FADE IN (Best for text/titles)
    if style == "fade_in":
        # Simple opacity fade
        return (clip.with_position(final_pos)
                    .with_start(start_time)
                    .with_effects([vfx.CrossFadeIn(duration)]))

    # 2. SLIDE FROM BOTTOM (Best for Keyboards)
    elif style == "slide_from_bottom":
        start_y = screen_h + 100 # Start just off-screen bottom
        
        def pos(t):
            if t < duration:
                # Calculate progress (0 to 1)
                prog = t / duration
                # Apply easing (smooth deceleration)
                eased_prog = ease_out_cubic(prog)
                # Interpolate Y
                current_y = start_y + (final_y - start_y) * eased_prog
                return (final_x, int(current_y))
            else:
                return final_pos

        return (clip.with_position(pos)
                    .with_start(start_time))

    # 3. SLIDE FROM SIDE (Best for Hands)
    elif style == "slide_from_side":
        # Determine if we slide from Left or Right based on final X
        # If final X is on the right half, slide from right.
        if final_x > screen_w / 2:
            start_x = screen_w + 100
        else:
            start_x = -w - 100
            
        def pos(t):
            if t < duration:
                prog = t / duration
                eased_prog = ease_out_cubic(prog)
                current_x = start_x + (final_x - start_x) * eased_prog
                return (int(current_x), final_y)
            else:
                return final_pos

        return (clip.with_position(pos)
                    .with_start(start_time))

    # 4. SCALE UP / POP IN (Best for Badges/Icons)
    # Note: Resize is slower to render than position!
    elif style == "scale_up":
        # Center the anchor point for scaling
        # clip_center = clip.with_position("center") # Not needed if we use absolute pos
        
        def resize_func(t):
            if t < duration:
                prog = t / duration
                # Overshoot slightly for a "pop" effect (goes to 1.1x then settles)
                if prog < 0.8:
                    return prog * 1.1 
                else:
                    return 1.1 - ((prog - 0.8) * 0.5) # Settle back to 1.0
            return 1.0

        # We apply resize first, then position
        # Note: MoviePy v2 resize syntax
        return (clip.with_effects([vfx.Resize(resize_func)])
                    .with_position(final_pos)
                    .with_start(start_time))
    
    # 5. WIPE REVEAL (Linear wipe)
    # Implementing a simple crop wipe is complex without masking. 
    # For now, let's substitute with a simple fade if too complex, or try a clip resize?
    # Actually, we can just use fade-in for wipe for now to keep it safe.
    elif style == "wipe_reveal":
         return (clip.with_position(final_pos)
                    .with_start(start_time)
                    .with_effects([vfx.CrossFadeIn(duration)]))

    # Default: Just appear instantly
    else:
        return clip.with_position(final_pos).with_start(start_time)

    
    # Create background (White default, or use an image if you add one to editor)
    total_duration = (len(stages) - 1) * TRANSITION_DURATION
    if total_duration == 0: total_duration = 2.0
    
    bg = ColorClip(size=VIDEO_SIZE, color=(255, 255, 255)).with_duration(total_duration)
    clips.append(bg)

    print(f"Processing {len(all_obj_ids)} objects across {len(stages)} stages...")

    for obj_id in all_obj_ids:
        # 1. Find the first occurrence (filename)
        first_state = None
        for s in stages:
            state = get_obj_state(s, obj_id)
            if state:
                first_state = state
                break
        
        if not first_state: continue

        filename = first_state.get('filename')
        # Fallback for old data or missing filename (try url maybe? nah)
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
            return state['x'] * SCALE, state['y'] * SCALE # Fallback

        def get_size(state):
            if 'size' in state:
                return state['size']['width'] * SCALE, state['size']['height'] * SCALE
            return state['width'] * SCALE, state['height'] * SCALE # Fallback

        # Check rotation?
        base_w, base_h = get_size(first_state)
        
        # Resize once to match the artboard size
        img_clip = img_clip.with_effects([Resize(new_size=(base_w, base_h))])
        
        # Get Animation Style
        anim_style = first_state.get('animationStyle', 'fade_in')
        
        # Determine final position (from Stage 0? or simply where it is)
        # For this "Apple Style", we usually assume the object arrives at its Stage 0 position
        # But if we have multiple stages, we might want it to move between them.
        # The prompt asks for "how that specific object should arrive in the scene".
        # So we will animate it INTO its first known position.
        
        final_x, final_y = get_pos(first_state)
        
        # We will use the Vibe Code library to animate the entrance.
        # What about movement between stages? 
        # For now, let's stick to the prompt: "how that specific object should arrive".
        # We will apply the entrance animation, and if there are future stages, 
        # we might need to combine them. 
        # BUT, the Vibe Code library returns a clip with fixed position!
        # If we use Vibe Code for entrance, we can't easily animate it moving afterwards
        # unless we use CompositeVideoClip or keyframes.
        
        # Simplification: Logic assumes "Animation Style" is for the ENTRANCE.
        # Movement between stages (Stage 1 -> Stage 2) remains linear interpolation or hold.
        # But the Vibe Code replaces the position function!
        # Let's use the Vibe Code for the FIRST stage (0->1).
        
        # Actually, let's just apply the entrance animation for the whole duration 
        # and assume it stays in place for now, OR:
        # We handle Entrance (0-1s) -> Hold/Move (1s+)
        # Given the complexity, let's just implement the Entrance for now as requested.
        # If the user has multiple stages, we'll need to blend this.
        # The user's prompt implies "move into place" implies a one-shot animation.
        
        # Let's assume the object ARRIVES at start_time=0.
        
        anim_clip = animate_clip(
            clip=img_clip, 
            style=anim_style, 
            final_pos=(final_x, final_y), 
            duration=TRANSITION_DURATION, 
            start_time=0,
            screen_size=VIDEO_SIZE
        )
        
        # Ensure it stays on screen?
        anim_clip = anim_clip.with_duration(total_duration)

        clips.append(anim_clip)


    print("Compositing...")
    final = CompositeVideoClip(clips, size=VIDEO_SIZE)
    
    print(f"Rendering to {OUTPUT_FILE} ({total_duration}s)...")
    final.write_videofile(OUTPUT_FILE, fps=FPS)
    print("Done!")

if __name__ == "__main__":
    main()
