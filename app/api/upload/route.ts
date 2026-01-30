
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: "No file received." }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())

        // Ensure local_assets dir exists
        const uploadDir = path.join(process.cwd(), 'local_assets')
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        const filename = file.name.replace(/\s+/g, '-') // Sanitize simple spaces
        const filepath = path.join(uploadDir, filename)

        await writeFile(filepath, buffer)

        console.log(`Saved file to ${filepath}`)

        return NextResponse.json({
            success: true,
            url: `/api/images/${filename}`,
            filename: filename
        })
    } catch (error) {
        console.error('Upload failed:', error)
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        )
    }
}
