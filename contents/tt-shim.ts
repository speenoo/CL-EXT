// Trusted Types shim for content-script isolated world only
// Goal: prevent third-party libs from throwing on policy names like "goog#html;"
// without affecting the page's main world. This runs before other imports.
try {
  const tt = (window as any).trustedTypes
  if (tt && typeof tt.createPolicy === "function") {
    const originalCreatePolicy = tt.createPolicy.bind(tt)
    tt.createPolicy = (name: string, rules: any) => {
      try {
        if (typeof name === "string") {
          // Strip a trailing semicolon that appears in some policy names on LI
          name = name.replace(/;$/, "")
        }
        return originalCreatePolicy(name, rules)
      } catch (e) {
        // Avoid crashing our isolated world – return a no-op policy
        try {
          console.debug("[dossi] TT createPolicy blocked:", name, e)
        } catch {}
        return {
          createHTML: (s: string) => s,
          createScript: (s: string) => s,
          createScriptURL: (s: string) => s,
        }
      }
    }
  }
} catch {}
