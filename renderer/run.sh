#!/bin/bash
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Run the render script
python3 render.py
