import { useTracking } from './useTrackingContext'

export function useSessionData() {
  return useTracking()
}
