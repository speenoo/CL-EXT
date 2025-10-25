import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (_req, res) => {
  try {
    const url = process.env.PLASMO_PUBLIC_HOST
    const name = process.env.PLASMO_PUBLIC_HOST_COOKIE

    if (!url || !name) {
      return res.send({ status: { ok: false, error: "missing env" } })
    }

    const cookie = await chrome.cookies.get({ url, name })

    if (!cookie || !cookie?.value) {
      return res.send({ status: { ok: false, error: "no cookie" } })
    }

    return res.send({ status: { ok: true }, token: cookie.value })
  } catch (e: any) {
    return res.send({ status: { ok: false, error: e?.message ?? "unknown" } })
  }
}

export default handler
