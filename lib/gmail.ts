export async function fetchSummarizedEmails(auth: OAuth2Client) {
    const gmail = google.gmail({ version: 'v1', auth })
    const res = await gmail.users.messages.list({ userId: 'me', maxResults: 10 })
    // ...
    return [{ subject: 'Mocked' }]
}
