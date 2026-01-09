export const syncLog = (...args: any[]) => {
  console.log("%c[SYNC]", "color:#4FC3F7;font-weight:bold;", ...args);
};

export const syncLogCreate = (...args: any[]) => {
  console.log("%c[SYNC CREATE]", "color:#4CAF50;font-weight:bold;", ...args);
};

export const syncLogDelete = (...args: any[]) => {
  console.log("%c[SYNC DELETE]", "color:#F44336;font-weight:bold;", ...args);
};
