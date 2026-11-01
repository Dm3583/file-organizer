import { MS_PER_DAY } from './constants.js';

export function getLastModifiedThreshold(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function getAgeInDays(date) {
  return (Date.now() - date.getTime()) / MS_PER_DAY;
}

export function getDaysSince(date) {
  return Math.floor(getAgeInDays(date));
}
