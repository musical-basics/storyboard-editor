
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ filename: string }> }
) {
    const { filename } = await params
    const filePath = path.join(process.cwd(), 'local_assets', filename)

    if (!existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 })
    }

    try {
        const fileBuffer = await readFile(filePath)

        // Determine mime type (basic)
        const ext = path.extname(filename).toLowerCase()
        let contentType = 'application/octet-stream'
        if (ext === '.png') contentType = 'image/png'
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
        else if (ext === '.svg') contentType = 'image/svg+xml'

        return new NextResponse(fileBuffer, {
            headers: { 'Content-Type': contentType }
        })
    } catch (e) {
        console.error("Error serving file:", e)
        return new NextResponse('Error serving file', { status: 500 })
    }
}
