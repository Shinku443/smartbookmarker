export const syncLog = (...args: any[]) => {
  console.log("%c[SYNC]", "color:#4FC3F7;font-weight:bold;", ...args);
};