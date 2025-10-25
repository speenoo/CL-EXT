const baseUrl = process.env.PLASMO_PUBLIC_HOST || "http://localhost:3003"

const beApiUrl = process.env.PLASMO_PUBLIC_BE_API_BASE_URL || `${baseUrl}/api`
const baseApiUrl = `${baseUrl}/api`


export { baseUrl, baseApiUrl, beApiUrl }
    