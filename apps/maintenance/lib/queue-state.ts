const SUNDAY = 0

export function businessDayCutoff(now = new Date(), days = 3) {
  const cutoff = new Date(now)
  let remaining = days

  while (remaining > 0) {
    cutoff.setDate(cutoff.getDate() - 1)
    if (cutoff.getDay() !== SUNDAY) remaining -= 1
  }

  return cutoff
}

export function isUnattended(latestUpdate: Date, now = new Date()) {
  return latestUpdate.getTime() <= businessDayCutoff(now).getTime()
}
