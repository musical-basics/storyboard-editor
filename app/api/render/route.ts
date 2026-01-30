
import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(req: Request) {
    try {
        const data = await req.json()

        // 1. Save JSON to temp file
        // We'll save it in the root directory effectively, or specific temp dir
        const tempFilePath = path.join(process.cwd(), 'temp_render_data.json')
        await writeFile(tempFilePath, JSON.stringify(data, null, 2))

        console.log('Saved temp data to:', tempFilePath)

        // 2. Run Python script
        // We assume the renderer virtual environment is set up.
        // We might need to activate it or call the python binary directly.
        // Let's try to use the 'run.sh' if it handles everything, or call python directly if we know the path.
        // For reliability in this specific environment, let's try to run `renderer/run.sh` but modified to accept input?
        // Or just call the python executable in the venv directly.

        // Command to run render.py
        // We are in project root.
        // render.py looks for standard files by default, but we'll modify it to look for temp_render_data.json if present.

        const pythonScript = path.join(process.cwd(), 'renderer', 'render.py')
        const venvPython = path.join(process.cwd(), 'renderer', 'venv', 'bin', 'python3')

        // Check if venv python exists, otherwise fallback to system python (risky but okay for now)
        // Actually, simpler: Assuming run.sh sets up env.

        const command = `"${venvPython}" "${pythonScript}" --input "${tempFilePath}" --output "${path.join(process.cwd(), 'public', 'rendered_video.mp4')}"`

        console.log('Executing:', command)

        const { stdout, stderr } = await execAsync(command)

        console.log('Python Output:', stdout)
        if (stderr) console.error('Python Error:', stderr)

        return NextResponse.json({
            success: true,
            videoUrl: '/rendered_video.mp4',
            logs: stdout
        })
    } catch (error) {
        console.error('Render failed:', error)
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        )
    }
}
