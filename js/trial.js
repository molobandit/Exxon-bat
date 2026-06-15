export const TRIAL_DAYS = 30;

export function createTrialUser({ email, firstname, isDemo = false, emailVerified = false }) {
  const now = new Date();
  const trialEndsAt = new Date(now);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  return {
    email,
    firstname,
    createdAt: now.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
    isDemo,
    emailVerified: isDemo ? true : Boolean(emailVerified),
  };
}

export function normalizeTrialUser(user) {
  if (!user) return null;
  if (user.subscribedAt || user.trialEndsAt) return user;
  return createTrialUser({
    email: user.email,
    firstname: user.firstname,
    isDemo: user.isDemo,
  });
}

export function isTrialActive(user) {
  if (!user?.trialEndsAt) return false;
  return Date.now() < new Date(user.trialEndsAt).getTime();
}

export function hasPaidSubscription(user) {
  return Boolean(user?.subscribedAt);
}

export function hasAppAccess(user) {
  if (!user) return false;
  if (user.isDemo) return true;
  return isTrialActive(user) || hasPaidSubscription(user);
}

export function getTrialDaysLeft(user) {
  if (!isTrialActive(user)) return 0;
  const ms = new Date(user.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function withSubscription(user) {
  if (!user) return null;
  return {
    ...user,
    subscribedAt: user.subscribedAt ?? new Date().toISOString(),
  };
}

export function getTrialStatusLabel(user) {
  const days = getTrialDaysLeft(user);
  if (days <= 0) return null;
  return days === 1 ? "1 jour restant" : `${days} jours restants`;
}
