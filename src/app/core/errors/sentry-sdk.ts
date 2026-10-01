// Seules fonctions du SDK utilisées : importées nommément pour que le chunk chargé en différé ne contienne
// pas tout Sentry (Replay, Feedback, traçage…), ce qu'un `import('@sentry/angular')` complet empêcherait.
export { captureException, init } from '@sentry/angular';
