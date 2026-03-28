export const isWebMode = import.meta.env.VITE_DEPLOY_TARGET === 'web'
export const isDesktopMode = !isWebMode
