// components/PDFExportButton.tsx
'use client'

import html2pdf from 'html2pdf.js'

export function PDFExportButton({ htmlId }: { htmlId: string }) {
    const handleExport = () => {
        const element = document.getElementById(htmlId)
        if (!element) return
        html2pdf().from(element).save()
    }

    return <button onClick={handleExport}>Export PDF</button>
}
