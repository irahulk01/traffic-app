// One request at a time, with bounded recovery and no polling while hidden/offline.
export function createTrafficPoller({ load, onSuccess, onFailure, onStatus, isVisible = () => true, isOnline = () => true, now = Date.now, schedule = setTimeout, cancel = clearTimeout, timeoutMs = 25000 }) {
  let stopped = false, timer, pending = null, controller, failures = 0;
  const clearTimer = () => { if (timer != null) cancel(timer); timer = undefined; };
  const refresh = () => {
    if (stopped || !isVisible()) return Promise.resolve();
    if (pending) return pending;
    clearTimer();
    if (!isOnline()) {
      onFailure(new Error('You’re offline. Updates will resume when your connection returns.'));
      onStatus({ isFetching: false, connectionState: 'offline', nextRetryAt: null });
      return Promise.resolve();
    }
    controller = new AbortController();
    onStatus({ isFetching: true, connectionState: 'checking', nextRetryAt: null });
    pending = Promise.resolve().then(async () => {
      let recommendedAt = 0;
      const timeout = schedule(() => controller.abort(), timeoutMs);
      try {
        const result = await load(controller.signal);
        if (stopped) return;
        failures = result.meta.dataState === 'fresh' ? 0 : failures + 1;
        recommendedAt = Date.parse(result.meta.nextRefreshAt) || 0;
        onSuccess(result);
      } catch (error) {
        if (stopped) return;
        failures++;
        onFailure(error);
      } finally {
        cancel(timeout);
        pending = null;
        if (!stopped) {
          const online = isOnline();
          const delay = Math.max(60000 * Math.min(3, 2 ** Math.max(0, failures - 1)), recommendedAt - now());
          const nextRetryAt = online ? now() + delay : null;
          onStatus({ isFetching: false, connectionState: !online ? 'offline' : failures ? 'recovering' : 'waiting', nextRetryAt });
          if (online && isVisible()) timer = schedule(refresh, delay);
        }
      }
    });
    return pending;
  };
  return {
    refresh,
    pause: clearTimer,
    offline() { clearTimer(); controller?.abort(); if (!pending) { onFailure(new Error('You’re offline. Updates will resume when your connection returns.')); onStatus({ isFetching: false, connectionState: 'offline', nextRetryAt: null }); } },
    stop() { stopped = true; clearTimer(); controller?.abort(); },
  };
}
