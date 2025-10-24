import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import type { User } from "~types/user"
import type { ExtensionSessionDto } from "~types/dtos/session-dto"

import { baseApiUrl } from "~lib/constants"

const storage = new Storage()

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  // console.log("get user request received")

  const cookie = await chrome.cookies.get({
    url: process.env.PLASMO_PUBLIC_HOST,
    name: process.env.PLASMO_PUBLIC_HOST_COOKIE,
  })

  const user = await storage.get<User>("user")

  if (!cookie) {
    // console.log("no cookie found, clearing all cached data")

    await storage.remove("user")
    await storage.remove("labels")

    return res.send({
      user: { isAuthed: false },
      status: { ok: false, error: "user not logged in" },
    })
  }

  if (cookie && !user?.isAuthed) {
    const resp = await fetch(`${baseApiUrl}/extension/session`, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    })
    console.log("user fetch response:", resp)

    const ok = resp.ok

    if (resp.ok) {
      const json: Partial<ExtensionSessionDto> = await resp.json()
      if (json?.user) {
        // save and return user (include organizations if provided)
        const nextUser: User = {
          isAuthed: true,
          attrs: json.user as User["attrs"],
          ...(Array.isArray(json.organizations)
            ? { organizations: json.organizations }
            : {}),
        }

        await storage.set("user", nextUser)

        return res.send({
          status: { ok },
          user: nextUser,
        })
      } else {
        // clear user & cache
        await storage.remove("user")
        await storage.remove("labels")

        return res.send({
          user: { isAuthed: false },
          status: { ok, error: "user not logged in" },
        })
      }
    } else {
      // clear user & cache
      await storage.remove("user")
      await storage.remove("labels")

      return res.send({
        user: { isAuthed: false },
        status: { ok, error: "user info not available" },
      })
    }
  } else {
    // console.log("user already logged in: returning cached user")

    return res.send({
      status: { ok: true },
      user,
    })
  }
}

export default handler
