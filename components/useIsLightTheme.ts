'use client'

import { useEffect, useState } from 'react'

/** True when the html element carries data-theme="light". Reacts to toggles. */
export function useIsLightTheme(): boolean {
  const [light, setLight] = useState(false)
  useEffect(() => {
    function check() {
      setLight(document.documentElement.getAttribute('data-theme') === 'light')
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return light
}
