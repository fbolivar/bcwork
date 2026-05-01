import { defineContentScript } from 'wxt/sandbox'

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    let lastUrl = location.href

    // Detecta navegación SPA (pushState / replaceState / hashchange)
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href
        chrome.runtime.sendMessage({
          type: 'url_changed',
          url: location.href,
          title: document.title,
        })
      }
    })

    observer.observe(document.body, { subtree: true, childList: true })

    window.addEventListener('popstate', () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href
        chrome.runtime.sendMessage({
          type: 'url_changed',
          url: location.href,
          title: document.title,
        })
      }
    })
  },
})
